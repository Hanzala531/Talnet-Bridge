import { User } from "../models/contents/User.models.js";
import { KYC } from "../models/student models/kyc.models.js";
import { successResponse, badRequestResponse, createdResponse, updatedResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ===============================
// UPLOAD KYC DOCUMENTS
// ===============================
const uploadDocs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            throw badRequest("Documents array is required");
        }

        // Validate document types
        const validDocTypes = ['CNIC', 'studentId', 'transcript', 'degree', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                throw badRequest(`Invalid document type: ${doc.docType}`);
            }
            if (!doc.docUrl) {
                throw badRequest("Document URL is required");
            }
        }

        // Check if KYC already exists
        const existingKYC = await KYC.findOne({ userId }).lean();
        if (existingKYC) {
            throw badRequest("KYC documents already submitted");
        }

        // Create new KYC record
        const kycData = {
            userId,
            documents,
            status: "pending"
        };

        const kyc = await KYC.create(kycData);

        return res.status(201).json(
            createdResponse(
                { kyc: { _id: kyc._id, status: kyc.status, documentsCount: documents.length } },
                "KYC documents uploaded successfully"
            )
        );
    } catch (error) {
        console.error("Upload KYC docs error:", error);
        throw error;
    }
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
                .select('userId status verifiedAt verifiedBy rejectionReason createdAt')
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
    } catch (error) {
        console.error("Get all KYC docs error:", error);
        throw internalServer("Failed to fetch KYC documents");
    }
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
    } catch (error) {
        console.error("Get KYC by ID error:", error);
        throw error;
    }
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
    } catch (error) {
        console.error("Get my KYC error:", error);
        throw internalServer("Failed to fetch KYC");
    }
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
    } catch (error) {
        console.error("Verify KYC error:", error);
        throw error;
    }
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

        // Validate document types
        const validDocTypes = ['CNIC', 'studentId', 'transcript', 'degree', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                throw badRequest(`Invalid document type: ${doc.docType}`);
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
    } catch (error) {
        console.error("Update KYC docs error:", error);
        throw error;
    }
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
    } catch (error) {
        console.error("Delete KYC error:", error);
        throw internalServer("Failed to delete KYC record");
    }
});

export {
    uploadDocs,
    getAllKYCDocs,
    getKYCById,
    getMyKYC,
    verifyKYC,
    updateKYCDocs,
    deleteKYC
};


