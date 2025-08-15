import { TrainingInstitute , Employer , User } from "../models/index.js";
import { successResponse , badRequestResponse ,notFoundResponse } from "../utils/ApiResponse.js";
import { badRequest , notFound , internalServer } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create company profile
const creatCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, companySize, industry, websiteLink } = req.body;
        if (!name || !companySize || !industry || !websiteLink) {
            throw badRequest("All fields (name, companySize, industry, websiteLink) are required.");
        }
        // Check if employer already exists for this user
        const existing = await Employer.findOne({ userId });
        if (existing) {
            throw badRequest("Employer profile already exists for this user.");
        }
        // Check for duplicate company name
        const duplicate = await Employer.findOne({ name: name.trim() });
        if (duplicate) {
            throw badRequest("A company with this name already exists.");
        }
        const employer = await Employer.create({
            userId,
            name: name.trim(),
            companySize: companySize.trim(),
            industry: industry.trim(),
            websiteLink: websiteLink.trim()
        });
        if (!employer) throw internalServer("Failed to create employer profile.");
        return res.status(201).json(createdResponse(employer, "Employer profile created successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});


// Get all companies
const getAllCompanies = asyncHandler(async (req, res) => {
    try {
        const companies = await Employer.find().populate({
            path: 'userId',
            select: 'fullName email phone'
        });
        if (!companies || companies.length === 0) {
            throw notFound("No companies found.");
        }
        return res.status(200).json(successResponse(companies, "Companies fetched successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Get a company by ID
const getCompanyById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) throw badRequest("Company ID is required.");
        const company = await Employer.findById(id).populate({
            path: 'userId',
            select: 'fullName email phone'
        });
        if (!company) throw notFound("Company not found.");
        return res.status(200).json(successResponse(company, "Company fetched successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});


// Update company details
const updateCompanyDetails = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) throw badRequest("Company ID is required.");
        // Only allow owner to update
        const company = await Employer.findById(id);
        if (!company) throw notFound("Company not found.");
        if (company.userId.toString() !== req.user._id.toString()) {
            throw forbidden("You are not authorized to update this company profile.");
        }
        // Validate fields (optional: add more validation as needed)
        if (updates.name) updates.name = updates.name.trim();
        if (updates.companySize) updates.companySize = updates.companySize.trim();
        if (updates.industry) updates.industry = updates.industry.trim();
        if (updates.websiteLink) updates.websiteLink = updates.websiteLink.trim();
        const updated = await Employer.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        return res.status(200).json(successResponse(updated, "Company profile updated successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Delete company profile and related jobs
const deleteCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) throw badRequest("Company ID is required.");
        const company = await Employer.findById(id);
        if (!company) throw notFound("Company not found.");
        if (company.userId.toString() !== req.user._id.toString()) {
            throw forbidden("You are not authorized to delete this company profile.");
        }
        // Delete all jobs posted by this employer
        const { Job } = await import('../models/index.js');
        await Job.deleteMany({ postedBy: req.user._id });
        await Employer.findByIdAndDelete(id);
        return res.status(200).json(successResponse(null, "Company profile and related jobs deleted successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Export controllers
export {
    creatCompanyProfile,
    getAllCompanies,
    getCompanyById,
    updateCompanyDetails,
    deleteCompanyProfile
};