import { User } from "../models/contents/User.models.js";
import { KYC } from "../models/student models/kyc.models.js";
import { successResponse, badRequestResponse, createdResponse, updatedResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { Student } from "../models/index.js";

// ===============================
// DOCUMENT UPLOAD CONTROLLER
// ===============================
const uploadDocs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            throw badRequest("Documents array is required");
        }

        // Validate document types (aligned with KYC model)
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                throw badRequest(`Invalid document type: ${doc.docType}. Valid types: ${validDocTypes.join(', ')}`);
            }
            if (!doc.docUrl) {
                throw badRequest("Document URL is required");
            }
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        kyc.documents = [...kyc.documents, ...documents];
        kyc.status = 'pending'; // Reset to pending after document upload
        await kyc.save();

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, documentsCount: kyc.documents.length } },
                "Documents uploaded successfully"
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// PERSONAL INFORMATION CONTROLLER
// ===============================
const updatePersonalInfo = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullLegalName, dateOfBirth, nationalInsuranceNumber, educationalQualifications } = req.body;

        if (!fullLegalName || !dateOfBirth) {
            throw badRequest("Full legal name and date of birth are required");
        }

        // Validate educational qualifications
        const validLevels = [
            "High School Diploma/Gcse",
            "A-Levels",
            "Bachelors Degree",
            "Masters Degree",
            "Professional Diploma",
            "Trade Certificate",
            "Other"
        ];
        if (educationalQualifications) {
            for (const qualification of educationalQualifications) {
                if (!validLevels.includes(qualification.level)) {
                    throw badRequest(`Invalid educational qualification level: ${qualification.level}`);
                }
            }
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        kyc.fullLegalName = fullLegalName;
        kyc.dateOfBirth = dateOfBirth;
        kyc.nationalInsuranceNumber = nationalInsuranceNumber;
        kyc.educationalQualifications = educationalQualifications;
        kyc.status = 'pending'; // Reset to pending after updates
        await kyc.save();

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status } },
                "Personal information updated successfully"
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// INITIAL KYC SUBMISSION
// ===============================
const submitInitialKYC = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { fullLegalName, dateOfBirth, nationalInsuranceNumber, educationalQualifications } = req.body;

        if (!fullLegalName || !dateOfBirth || !req.files || req.files.length === 0) {
            throw badRequest("Full legal name, date of birth, and documents are required");
        }

        // Convert dateOfBirth to a valid format
        const parsedDateOfBirth = new Date(dateOfBirth);
        if (isNaN(parsedDateOfBirth)) {
            throw badRequest("Invalid date format for dateOfBirth. Use YYYY-MM-DD.");
        }

        // Validate educational qualifications
        const validLevels = [
            "High School Diploma/Gcse",
            "A-Levels",
            "Bachelors Degree",
            "Masters Degree",
            "Professional Diploma",
            "Trade Certificate",
            "Other"
        ];
        if (educationalQualifications) {
            for (const qualification of educationalQualifications) {
                if (!validLevels.includes(qualification.level)) {
                    throw badRequest(`Invalid educational qualification level: ${qualification.level}`);
                }
            }
        }

        // Upload documents to Cloudinary
        const documents = [];
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        
        for (const file of req.files) {
            const uploadResult = await uploadOnCloudinary(file.path);
            
            let docType = file.fieldname;
            if (!validDocTypes.includes(docType)) {
                docType = 'other'; // Default to 'other' if invalid
            }
            
            documents.push({
                docType: docType,
                docUrl: uploadResult.secure_url
            });
        }

        // Check if KYC already exists
        const existingKYC = await KYC.findOne({ userId }).lean();
        if (existingKYC) {
            throw badRequest("KYC already submitted. Use update controllers for modifications.");
        }



        // Create new KYC record
        const kycData = {
            userId,
            fullLegalName,
            dateOfBirth: parsedDateOfBirth, // Use the parsed date
            nationalInsuranceNumber,
            documents,
            educationalQualifications,
            status: "pending"
        };

        const kyc = await KYC.create(kycData);

        // update the student profile
        const student = await Student.findOne({userId: userId})
        student.kycVerification=kycData._id
        return res.status(201).json(
            createdResponse(
                { kyc: { _id: kyc._id, status: kyc.status, documentsCount: documents.length } },
                "KYC submitted successfully"
            )
        );
    } catch (error) {
        throw error;
    }
});

// ===============================
// EDUCATIONAL CERTIFICATES CONTROLLER
// ===============================
const uploadEducationalCertificates = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.files || req.files.length === 0) {
            throw badRequest("Certificates are required");
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        // Upload certificates to Cloudinary
        const certificates = [];
        for (const file of req.files) {
            const uploadResult = await uploadOnCloudinary(file.path);
            certificates.push({
                docType: "educationalCertificates",
                docUrl: uploadResult.secure_url
            });
        }

        kyc.documents = [...kyc.documents, ...certificates];
        kyc.status = 'pending'; // Reset to pending after certificate upload
        await kyc.save();

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, certificatesCount: certificates.length } },
                "Educational certificates uploaded successfully"
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// ADDITIONAL DOCUMENT UPLOAD
// ===============================
const addDocuments = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        if (!req.files || req.files.length === 0) {
            throw badRequest("Documents are required");
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        // Upload documents to Cloudinary
        const documents = [];
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        
        for (const file of req.files) {
            const uploadResult = await uploadOnCloudinary(file.path);
            
            // Use the fieldname as docType, but validate it
            let docType = file.fieldname;
            if (!validDocTypes.includes(docType)) {
                docType = 'other'; // Default to 'other' if fieldname is not valid
            }
            
            documents.push({
                docType: docType,
                docUrl: uploadResult.secure_url
            });
        }

        kyc.documents = [...kyc.documents, ...documents];
        kyc.status = 'pending'; // Reset to pending after document upload
        await kyc.save();

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, documentsCount: kyc.documents.length } },
                "Documents added successfully"
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// GET ALL KYC DOCUMENTS (ADMIN)
// ===============================
const getAllKYCDocs = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, status, sort = '-createdAt' } = req.query;

        const filter = {};
        if (status && ['pending', 'verified', 'rejected'].includes(status)) {
            filter.status = status;
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [kycDocs, total] = await Promise.all([
            KYC.find(filter)
                .select('userId fullLegalName dateOfBirth nationalInsuranceNumber status verifiedAt verifiedBy rejectionReason createdAt')
                .populate('userId', 'fullName email phone')
                .populate('verifiedBy', 'fullName email')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            KYC.countDocuments(filter)
        ]);

        return res.status(200).json(
            successResponse(
                {
                    kycDocs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "KYC documents retrieved successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to fetch KYC documents");}
});

// ===============================
// GET KYC BY ID
// ===============================
const getKYCById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid KYC ID");
        }

        const kyc = await KYC.findById(id)
            .populate('userId', 'fullName email phone role')
            .populate('verifiedBy', 'fullName email')
            .lean();

        if (!kyc) {
            throw notFound("KYC record not found");
        }

        // Check if user can access this KYC
        if (req.user.role !== 'admin' && kyc.userId._id.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        return res.status(200).json(successResponse({ kyc }, "KYC retrieved successfully"));
    } catch (error) {throw error;}
});

// ===============================
// GET USER'S OWN KYC
// ===============================
const getMyKYC = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const kyc = await KYC.findOne({ userId })
            .select('-documents.docUrl') // Hide sensitive URLs for basic view
            .populate('verifiedBy', 'fullName email')
            .lean();

        if (!kyc) {
            throw notFound("No KYC record found");
        }

        return res.status(200).json(successResponse({ kyc }, "KYC retrieved successfully"));
    } catch (error) {throw internalServer("Failed to fetch KYC");}
});

// ===============================
// VERIFY KYC (ADMIN)
// ===============================
const verifyKYC = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rejectionReason } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid KYC ID");
        }

        if (!['verified', 'rejected'].includes(status)) {
            throw badRequest("Status must be 'verified' or 'rejected'");
        }

        if (status === 'rejected' && !rejectionReason) {
            throw badRequest("Rejection reason is required when rejecting KYC");
        }

        const updateData = {
            status,
            verifiedBy: req.user._id,
            verifiedAt: new Date()
        };

        if (status === 'rejected') {
            updateData.rejectionReason = rejectionReason;
        }

        const kyc = await KYC.findByIdAndUpdate(id, updateData, { new: true })
            .populate('userId', 'fullName email')
            .lean();

        if (!kyc) {
            throw notFound("KYC record not found");
        }

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, verifiedAt: kyc.verifiedAt } },
                `KYC ${status} successfully`
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// UPDATE KYC DOCUMENTS
// ===============================
const updateKYCDocs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            throw badRequest("Documents array is required");
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        if (kyc.status === 'verified') {
            throw badRequest("Cannot update verified KYC documents");
        }

        // Validate document types (aligned with KYC model)
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                throw badRequest(`Invalid document type: ${doc.docType}. Valid types: ${validDocTypes.join(', ')}`);
            }
            if (!doc.docUrl) {
                throw badRequest("Document URL is required");
            }
        }

        kyc.documents = documents;
        kyc.status = 'pending'; // Reset to pending after update
        kyc.rejectionReason = undefined;
        kyc.verifiedAt = undefined;
        kyc.verifiedBy = undefined;

        await kyc.save();

        return res.status(200).json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, documentsCount: documents.length } },
                "KYC documents updated successfully"
            )
        );
    } catch (error) {throw error;}
});

// ===============================
// DELETE KYC (ADMIN ONLY)
// ===============================
const deleteKYC = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid KYC ID");
        }

        const kyc = await KYC.findByIdAndDelete(id);
        if (!kyc) {
            throw notFound("KYC record not found");
        }

        return res.status(200).json(successResponse(null, "KYC record deleted successfully"));
    } catch (error) {throw internalServer("Failed to delete KYC record");}
});

export {
    uploadDocs,
    updatePersonalInfo,
    submitInitialKYC,
    uploadEducationalCertificates,
    addDocuments,
    getAllKYCDocs,
    getKYCById,
    getMyKYC,
    verifyKYC,
    updateKYCDocs,
    deleteKYC
};


