import { Certification } from "../models/student models/certification.models.js";
import { successResponse, createdResponse, updatedResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// =====================
// CREATE CERTIFICATION
// =====================
const createCertification = asyncHandler(async (req, res) => {
    try {
        const { name, issuedBy, issueDate, certificateFile } = req.body;

        if (!name || !issuedBy) {
            throw badRequest("Name and issuedBy are required");
        }

        // Check for duplicate certification
        const existingCert = await Certification.findOne({ 
            name: name.trim(), 
            issuedBy: issuedBy.trim() 
        }).lean();

        if (existingCert) {
            throw badRequest("Certification with this name and issuer already exists");
        }

        const certificationData = {
            name: name.trim(),
            issuedBy: issuedBy.trim(),
            issueDate: issueDate ? new Date(issueDate) : undefined,
            certificateFile,
            extracted: false
        };

        const certification = await Certification.create(certificationData);

        return res.status(201).json(
            createdResponse(
                { 
                    certification: {
                        _id: certification._id,
                        name: certification.name,
                        issuedBy: certification.issuedBy,
                        issueDate: certification.issueDate
                    }
                },
                "Certification created successfully"
            )
        );
    } catch (error) {throw error;
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

        return res.status(200).json(
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
            throw badRequest("Invalid certification ID");
        }

        const certification = await Certification.findById(id).lean();

        if (!certification) {
            throw notFound("Certification not found");
        }

        return res.status(200).json(
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
            throw badRequest("Invalid certification ID");
        }

        const certification = await Certification.findById(id);
        if (!certification) {
            throw notFound("Certification not found");
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
                    throw badRequest("Certification with this name and issuer already exists");
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

        return res.status(200).json(
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
    } catch (error) {throw error;
    }
});

// ===============================
// DELETE CERTIFICATION
// ===============================
const deleteCertification = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid certification ID");
        }

        const certification = await Certification.findByIdAndDelete(id);
        if (!certification) {
            throw notFound("Certification not found");
        }

        return res.status(200).json(
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
            throw badRequest("Search query must be at least 2 characters");
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

        return res.status(200).json(
            successResponse(
                { 
                    certifications,
                    total: certifications.length,
                    searchTerm
                },
                "Certifications search completed"
            )
        );
    } catch (error) {throw error;
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
            throw badRequest("Issuer name must be at least 2 characters");
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

        return res.status(200).json(
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
    } catch (error) {throw error;
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
