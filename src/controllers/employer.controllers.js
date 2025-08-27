import { TrainingInstitute , Employer , User } from "../models/index.js";
import { successResponse ,createdResponse, badRequestResponse ,notFoundResponse, serverErrorResponse, forbiddenResponse } from "../utils/ApiResponse.js";
import { badRequest , notFound , internalServer } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create company profile
const creatCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, companySize, industry, websiteLink, location } = req.body;
        if (!name || !companySize || !industry || !websiteLink || !location) {
            return res.json(badRequestResponse("All fields (name, companySize, industry, websiteLink, location) are required."));
        }
        // Check if employer already exists for this user
        const existing = await Employer.findOne({ userId });
        if (existing) {
            return res.json(badRequestResponse("Employer profile already exists for this user."));
        }
        // Check for duplicate company name
        const duplicate = await Employer.findOne({ name: name.trim() });
        if (duplicate) {
            return res.json(badRequestResponse("A company with this name already exists."));
        }
        const employer = await Employer.create({
            userId,
            name: name.trim(),
            companySize: companySize.trim(),
            industry: industry.trim(),
            websiteLink: websiteLink.trim(),
            location: location.trim()
        });
        if (!employer) return res.json(serverErrorResponse("Failed to create employer profile."));
        return res.json(createdResponse(employer, "Employer profile created successfully."));
    } catch (error) {
       throw internalServer("Failed to create employer profile");
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
            return res.json( notFoundResponse("No companies found."));
        }
        return res.json(successResponse(companies, "Companies fetched successfully."));
    } catch (error) {
        throw internalServer("Failed to fetch companies");
    }
});

// Get a company by ID
const getCompanyById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.json (badRequestResponse("Company ID is required."));
        const company = await Employer.findById(id).populate({
            path: 'userId',
            select: 'fullName email phone'
        });
        if (!company) return res.json (notFoundResponse("Company not found."));
        return res.json(successResponse(company, "Company fetched successfully."));
    } catch (error) {
        throw internalServer("Failed to fetch the company")
    }
});


// Update company details
const updateCompanyDetails = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id)return res.json (badRequestResponse("Company ID is required."));
        // Only allow owner to update
        const company = await Employer.findById(id);
        if (!company) return res.json(notFoundResponse("Company not found."));
        if (company.userId.toString() !== req.user._id.toString()) {
            return res.json( forbiddenResponse("You are not authorized to update this company profile."));
        }
        // Validate fields (optional: add more validation as needed)
        if (updates.name) updates.name = updates.name.trim();
        if (updates.companySize) updates.companySize = updates.companySize.trim();
        if (updates.industry) updates.industry = updates.industry.trim();
        if (updates.websiteLink) updates.websiteLink = updates.websiteLink.trim();
        if (updates.location) updates.location = updates.location.trim();
        const updated = await Employer.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        return res.json(successResponse(updated, "Company profile updated successfully."));
    } catch (error) {
       throw internalServer("Failed to update company profile");
    }
});

// Delete company profile and related jobs
const deleteCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.json (badRequestResponse("Company ID is required."));
        const company = await Employer.findById(id);
        if (!company) return res.json (notFoundResponse("Company not found."));
        if (company.userId.toString() !== req.user._id.toString()) {
            return res.json (forbiddenResponse("You are not authorized to delete this company profile."));
        }
        // Delete all jobs posted by this employer
        const { Job } = await import('../models/index.js');
        await Job.deleteMany({ postedBy: req.user._id });
        await Employer.findByIdAndDelete(id);
        return res.json(successResponse(null, "Company profile and related jobs deleted successfully."));
    } catch (error) {
        throw internalServer("Company and all its data eraised successfully");
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