import mongoose from "mongoose";
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import { Certification } from "../models/student models/certification.models.js";
import { successResponse, createdResponse, updatedResponse, serverErrorResponse, notFoundResponse, badRequestResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Student } from "../models/index.js";

// =====================
// CREATE CERTIFICATION
// =====================
const createCertification = asyncHandler(async (req, res) => {
    try {
        const { name, issuedBy, issueDate } = req.body;

        if (!name || !issuedBy) {
                  return res.json( badRequestResponse("Certificate name and issuer is required"));
        }

        // Duplicate check
        const existingCert = await Certification.findOne({
            name: name.trim(),
            issuedBy: issuedBy.trim()
        });

        if (existingCert) {
                  return res.json( badRequestResponse("Certification with this name already exists"));
        }

        // File validation
        const localImagePath = req.file?.path || req.files?.[0]?.path;
        if (!localImagePath) {
                  return res.json( badRequestResponse("Certificate file not provided"));
        }

        // Upload to Cloudinary
        const imageUrl = await uploadOnCloudinary(localImagePath).catch(() => null);
        if (!imageUrl) {
            fs.unlinkSync(localImagePath);
            return res.json( serverErrorResponse("Failed to upload certification"));
        }
        fs.unlink

        // Save certification
        const certification = await Certification.create({
            name: name.trim(),
            issuedBy: issuedBy.trim(),
            issueDate: issueDate || null,
            certificateFile: imageUrl.secure_url
        });

        if (!certification) {
                  return res.json( serverErrorResponse("Failed to upload certificate"));
        }

        // Link certification to student
        // Assumes req.user.id is the student's user _id (adjust if needed)
        const student = await Student.findOne({ userId: req.user.id });
        if (!student) {
            // Optionally, you may want to delete the created certification if student not found
            await Certification.findByIdAndDelete(certification._id);
                  return res.json( notFoundResponse("Student not found to link certification"));
        }
        student.certifications = Array.isArray(student.certifications)
            ? [...student.certifications, certification._id]
            : [certification._id];
        await student.save();

        return res.status(201).json(
            createdResponse(
                certification ,
                "Certification created and linked to student successfully"
            )
        );

    } catch (error) {
        if (error.statusCode) {
            throw error;
        }
        throw internalServer("Something went wrong while creating certification");
    }
});


// ===============================
// GET ALL CERTIFICATIONS
// ===============================
const getAllCertifications = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 20, search, issuedBy, sort = 'name', select } = req.query;

        const filter = {};
        
        // Search by name
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }

        // Filter by issuer
        if (issuedBy) {
            filter.issuedBy = { $regex: issuedBy, $options: 'i' };
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        // Build projection for performance
        let projection = '_id name issuedBy issueDate extracted createdAt';
        if (select) {
            projection = select.split(',').join(' ');
        }

        const [certifications, total] = await Promise.all([
            Certification.find(filter)
                .select(projection)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Certification.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    certifications,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Certifications retrieved successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to fetch certifications");
    }
});

// ===============================
// GET CERTIFICATION BY ID
// ===============================
const getCertificationById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.json( badRequestResponse("Invalid certification id provided"));
        }

        const certification = await Certification.findById(id).lean();

        if (!certification) {
         return res.json( badRequestResponse("Certi"));
        }

        return res.json(
            successResponse({ certification }, "Certification retrieved successfully")
        );
    } catch (error) {throw error;
    }
});

// ===============================
// UPDATE CERTIFICATION
// ===============================
const updateCertification = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, issuedBy, issueDate, certificateFile, extracted } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.json(badRequestResponse("Invalid certification ID"));
        }

        const certification = await Certification.findById(id);
        if (!certification) {
            return res.json( notFoundResponse("Certification not found"))
        }

        // Check for duplicate if name or issuer is being changed
        if (name || issuedBy) {
            const newName = name ? name.trim() : certification.name;
            const newIssuedBy = issuedBy ? issuedBy.trim() : certification.issuedBy;

            if (newName !== certification.name || newIssuedBy !== certification.issuedBy) {
                const existingCert = await Certification.findOne({
                    _id: { $ne: id },
                    name: newName,
                    issuedBy: newIssuedBy
                }).lean();

                if (existingCert) {
                    return res.json (badRequestResponse("Certification with this name and issuer already exists"));
                }
            }
        }

        // Update fields
        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (issuedBy !== undefined) updateData.issuedBy = issuedBy.trim();
        if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
        if (certificateFile !== undefined) updateData.certificateFile = certificateFile;
        if (extracted !== undefined) updateData.extracted = Boolean(extracted);

        Object.assign(certification, updateData);
        await certification.save();

        return res.json(
            updatedResponse(
                {
                    certification: {
                        _id: certification._id,
                        name: certification.name,
                        issuedBy: certification.issuedBy,
                        issueDate: certification.issueDate,
                        extracted: certification.extracted
                    }
                },
                "Certification updated successfully"
            )
        );
    } catch (error) {throw internalServer("Failed in updating the certifications");
    }
});

// ===============================
// DELETE CERTIFICATION
// ===============================
const deleteCertification = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.json (badRequestResponse("Invalid certification ID"));
        }

        const certification = await Certification.findByIdAndDelete(id);
        if (!certification) {
            return res.json (notFoundResponse("Certification not found"));
        }

        return res.json(
            successResponse(null, "Certification deleted successfully")
        );
    } catch (error) {throw internalServer("Failed to delete certification");
    }
});

// ===============================
// SEARCH CERTIFICATIONS
// ===============================
const searchCertifications = asyncHandler(async (req, res) => {
    try {
        const { q, limit = 20 } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json (badRequestResponse("Search query must be at least 2 characters"));
        }

        const searchTerm = q.trim();
        const limitNum = Math.min(Number(limit), 50);

        const certifications = await Certification.find({
            $or: [
                { name: { $regex: searchTerm, $options: 'i' } },
                { issuedBy: { $regex: searchTerm, $options: 'i' } }
            ]
        })
        .select('_id name issuedBy issueDate')
        .sort({ name: 1 })
        .limit(limitNum)
        .lean();

        return res.json(
            successResponse(
                { 
                    certifications,
                    total: certifications.length,
                    searchTerm
                },
                "Certifications search completed"
            )
        );
    } catch (error) {
        throw internalServer('Failed in searching certifications');
    }
});

// ===============================
// GET CERTIFICATIONS BY ISSUER
// ===============================
const getCertificationsByIssuer = asyncHandler(async (req, res) => {
    try {
        const { issuer } = req.params;
        const { page = 1, limit = 20 } = req.query;

        if (!issuer || issuer.trim().length < 2) {
            return res.json( badRequest("Issuer name must be at least 2 characters"));
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const filter = { issuedBy: { $regex: issuer.trim(), $options: 'i' } };

        const [certifications, total] = await Promise.all([
            Certification.find(filter)
                .select('_id name issuedBy issueDate extracted')
                .sort({ name: 1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Certification.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    certifications,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    },
                    issuer: issuer.trim()
                },
                "Certifications by issuer retrieved successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to retrive certifications by an issuer");
    }
});

export {
    createCertification,
    getAllCertifications,
    getCertificationById,
    updateCertification,
    deleteCertification,
    searchCertifications,
    getCertificationsByIssuer
};
