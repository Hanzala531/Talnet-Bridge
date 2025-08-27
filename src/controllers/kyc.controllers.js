import { User } from "../models/contents/User.models.js";
import { KYC } from "../models/student models/kyc.models.js";
import { successResponse, badRequestResponse, createdResponse, updatedResponse, notFoundResponse, forbiddenResponse } from "../utils/ApiResponse.js";
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
            return res.json(badRequestResponse("Documents array is required"));
        }

        // Validate document types (aligned with KYC model)
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                return res.json(badRequestResponse(`Invalid document type: ${doc.docType}. Valid types: ${validDocTypes.join(', ')}`));
            }
            if (!doc.docUrl) {
                return res.json(badRequestResponse("Document URL is required"));
            }
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            return res.json( notFoundResponse("KYC record not found"));
        }

        kyc.documents = [...kyc.documents, ...documents];
        kyc.status = 'pending'; // Reset to pending after document upload
        await kyc.save();

        return res.json(
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
            return res.json(badRequestResponse("Full legal name and date of birth are required"));
        }

        // Validate and normalize educational qualifications
        const validLevels = [
            "High School Diploma/Gcse",
            "A-Levels",
            "Bachelors Degree",
            "Masters Degree",
            "Professional Diploma",
            "Trade Certificate",
            "Other"
        ];
        let normalizedQualifications = educationalQualifications;
        if (educationalQualifications) {
            // If a string is sent, convert to array of objects
            if (typeof educationalQualifications === "string") {
                normalizedQualifications = [{ level: educationalQualifications }];
            } else if (Array.isArray(educationalQualifications) && typeof educationalQualifications[0] === "string") {
                normalizedQualifications = educationalQualifications.map(lvl => ({ level: lvl }));
            }
            for (const qualification of normalizedQualifications) {
                if (!validLevels.includes(qualification.level)) {
                    return res.json(badRequestResponse(`Invalid educational qualification level: ${qualification.level}`));
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
    kyc.educationalQualifications = normalizedQualifications;
    kyc.status = 'pending'; // Reset to pending after updates
    await kyc.save();

        return res.json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status } },
                "Personal information updated successfully"
            )
        );
    } catch (error) {
        throw internalServer(error.message);}
});

// ===============================
// INITIAL KYC SUBMISSION
// ===============================
// ===============================
// KYC SUBMISSION (Initial + Educational Certificates)
// ===============================
const submitInitialKYC = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      fullLegalName,
      dateOfBirth,
      nationalInsuranceNumber,
      educationalQualifications,
    } = req.body;

    // Check if a KYC record exists already
    let kyc = await KYC.findOne({ userId });

    // ======================================================
    // CASE 1: Initial KYC Submission
    // ======================================================
    if (!kyc) {
      if (!fullLegalName || !dateOfBirth || !req.files || Object.keys(req.files).length === 0) {
        return res.json(badRequestResponse("Full legal name, date of birth, and documents are required for initial KYC."));
      }

      // Validate date
      const parsedDateOfBirth = new Date(dateOfBirth);
      if (isNaN(parsedDateOfBirth)) {
        return res.json(badRequestResponse("Invalid date format for dateOfBirth. Use YYYY-MM-DD."));
      }

            // Validate and normalize educational qualifications (if provided)
            const validLevels = [
                "High School Diploma/Gcse",
                "A-Levels",
                "Bachelors Degree",
                "Masters Degree",
                "Professional Diploma",
                "Trade Certificate",
                "Other"
            ];
            let normalizedQualifications = educationalQualifications;
            if (educationalQualifications) {
                if (typeof educationalQualifications === "string") {
                    normalizedQualifications = [educationalQualifications];
                } else if (Array.isArray(educationalQualifications) && typeof educationalQualifications[0] === "string") {
                    normalizedQualifications = educationalQualifications;
                }
                for (const qualification of normalizedQualifications) {
                    if (!validLevels.includes(qualification)) {
                        return res.json(badRequestResponse(`Invalid educational qualification level: ${qualification}`));
                    }
                }
            }

      // Upload documents
      const documents = [];
      const validDocTypes = [
        "addressProof",
        "govtId",
        "electricityBill",
        "bankStatement",
        "educationalCertificates", // optional
        "other",
      ];

            for (const field in req.files) {
                for (const file of req.files[field]) {
                    const uploadResult = await uploadOnCloudinary(file.path);
                    let docType = file.fieldname;
                    if (!validDocTypes.includes(docType)) {
                        docType = "other";
                    }
                    documents.push({ docType, docUrl: uploadResult.secure_url });
                }
            }

            // Create KYC
            const kycData = {
                userId,
                fullLegalName,
                dateOfBirth: parsedDateOfBirth,
                nationalInsuranceNumber,
                documents,
                educationalQualifications: normalizedQualifications,
                status: "pending",
            };

            kyc = await KYC.create(kycData);

      // Link to student profile
      const student = await Student.findOne({ userId });
      if (student) {
        student.kycVerification = kyc._id;
        await student.save();
      }

      return res.json(
        createdResponse(
          { kyc: { _id: kyc._id, status: kyc.status, documentsCount: documents.length } },
          "KYC submitted successfully"
        )
      );
    }

    // ======================================================
    // CASE 2: Upload Additional Educational Certificates
    // ======================================================
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.json(badRequestResponse("Certificates are required for update."));
    }

    const certificates = [];
    if (req.files.educationalCertificates) {
      for (const file of req.files.educationalCertificates) {
        const uploadResult = await uploadOnCloudinary(file.path);
        certificates.push({
          docType: "educationalCertificates",
          docUrl: uploadResult.secure_url,
        });
      }
    }

    // Append certificates
    if (certificates.length > 0) {
      kyc.documents = [...kyc.documents, ...certificates];
      kyc.status = "pending"; // Reset status on new uploads
      await kyc.save();
    }

    return res.json(
      updatedResponse(
        { kyc: { _id: kyc._id, status: kyc.status, certificatesCount: certificates.length } },
        "Educational certificates uploaded successfully"
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
            return res.json(badRequestResponse("Certificates are required"));
        }

        const kyc = await KYC.findOne({ userId });
                let normalizedQualifications = educationalQualifications;
                if (educationalQualifications) {
                    if (typeof educationalQualifications === "string") {
                        normalizedQualifications = [educationalQualifications];
                    } else if (Array.isArray(educationalQualifications) && typeof educationalQualifications[0] === "string") {
                        normalizedQualifications = educationalQualifications;
                    }
                    for (const qualification of normalizedQualifications) {
                        if (!validLevels.includes(qualification)) {
                            return res.json(badRequestResponse(`Invalid educational qualification level: ${qualification}`));
                        }
                    }
        }

        kyc.documents = [...kyc.documents, ...certificates];
        kyc.status = 'pending'; // Reset to pending after certificate upload
        await kyc.save();

        return res.json(
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
            return res.json(badRequestResponse("Documents are required"));
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            return res.json (notFoundResponse("KYC record not found"));
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

        return res.json(
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

        return res.json(
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
            return res.json(badRequestResponse("Invalid KYC ID"));
        }

        const kyc = await KYC.findById(id)
            .populate('userId', 'fullName email phone role')
            .populate('verifiedBy', 'fullName email')
            .lean();

        if (!kyc) {
            return res.json(notFoundResponse("KYC record not found"));
        }

        // Check if user can access this KYC
        if (req.user.role !== 'admin' && kyc.userId._id.toString() !== req.user._id.toString()) {
            return res.json(forbiddenResponse("Access denied"));
        }

        return res.json(successResponse({ kyc }, "KYC retrieved successfully"));
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
            return res.json (notFoundResponse("No KYC record found"));
        }

        return res.json(successResponse({ kyc }, "KYC retrieved successfully"));
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
            return res.json(badRequestResponse("Invalid KYC ID"));
        }

        if (!['verified', 'rejected'].includes(status)) {
            return res.json(badRequestResponse("Status must be 'verified' or 'rejected'"));
        }

        if (status === 'rejected' && !rejectionReason) {
            return res.json(badRequestResponse("Rejection reason is required when rejecting KYC"));
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
            return res.json (notFoundResponse("KYC record not found"));
        }

        return res.json(
            updatedResponse(
                { kyc: { _id: kyc._id, status: kyc.status, verifiedAt: kyc.verifiedAt } },
                `KYC ${status} successfully`
            )
        );
    } catch (error) {throw internalServer(error);}
});

// ===============================
// UPDATE KYC DOCUMENTS
// ===============================
const updateKYCDocs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { documents } = req.body;

        if (!documents || !Array.isArray(documents) || documents.length === 0) {
            return res.json(badRequestResponse("Documents array is required"));
        }

        const kyc = await KYC.findOne({ userId });
        if (!kyc) {
            return res.json (notFoundResponse("KYC record not found"));
        }

        if (kyc.status === 'verified') {
            return res.json(badRequestResponse("Cannot update verified KYC documents"));
        }

        // Validate document types (aligned with KYC model)
        const validDocTypes = ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other'];
        for (const doc of documents) {
            if (!doc.docType || !validDocTypes.includes(doc.docType)) {
                return res.json(badRequestResponse(`Invalid document type: ${doc.docType}. Valid types: ${validDocTypes.join(', ')}`));
            }
            if (!doc.docUrl) {
                return res.json(badRequestResponse("Document URL is required"));
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
    } catch (error) {throw internalServer(error);}
});

// ===============================
// DELETE KYC (ADMIN ONLY)
// ===============================
const deleteKYC = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.json(badRequestResponse("Invalid KYC ID"));
        }

        const kyc = await KYC.findByIdAndDelete(id);
        if (!kyc) {
            return res.json (notFoundResponse("KYC record not found"));
        }

        return res.json(successResponse(null, "KYC record deleted successfully"));
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


