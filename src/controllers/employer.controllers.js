import { TrainingInstitute , Employer , User } from "../models/index.js";
import { successResponse ,createdResponse, badRequestResponse ,notFoundResponse, serverErrorResponse, forbiddenResponse } from "../utils/ApiResponse.js";
import { badRequest , notFound , internalServer } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";


// Create company profile
const creatCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, companySize, industry, websiteLink, location, description } = req.body;
        
        // Validate required fields
        if (!name || !companySize || !industry || !websiteLink) {
            return res.json(badRequestResponse("All fields (name, companySize, industry, websiteLink) are required."));
        }
        
        // Check if employer already exists for this user
        const existingEmployer = await Employer.findOne({ userId });
        if (existingEmployer) {
            return res.json(conflictResponse("Employer profile already exists for this user."));
        }
        
        // Check for duplicate company name
        const duplicateCompany = await Employer.findOne({ name: name.trim() });
        if (duplicateCompany) {
            return res.json(conflictResponse("A company with this name already exists."));
        }
        
        // Create new employer profile
        const employer = await Employer.create({
            userId: userId,
            name: name.trim(),
            companySize: companySize.trim(),
            industry: industry.trim(),
            websiteLink: websiteLink.trim(),
            location: location?.trim(),
            description: description?.trim()
        });
        
        if (!employer) {
            return res.json(serverErrorResponse("Failed to create employer profile."));
        }
        
        // Populate user details for response
        const populatedEmployer = await Employer.findById(employer._id)
            .populate({ path: 'userId', select: 'fullName email phone profilePicture' });
        
        const responseData = {
            _id: populatedEmployer._id,
            name: populatedEmployer.name,
            companySize: populatedEmployer.companySize,
            industry: populatedEmployer.industry,
            websiteLink: populatedEmployer.websiteLink,
            location: populatedEmployer.location,
            description: populatedEmployer.description,
            userId: populatedEmployer.userId._id,
            userDetails: {
                fullName: populatedEmployer.userId.fullName,
                email: populatedEmployer.userId.email,
                phone: populatedEmployer.userId.phone,
                profilePicture: populatedEmployer.userId.profilePicture
            },
            createdAt: populatedEmployer.createdAt,
            updatedAt: populatedEmployer.updatedAt
        };
        
        return res.json(createdResponse(responseData, "Employer profile created successfully."));
    } catch (error) {
        console.error("Error in creatCompanyProfile:", error);
        return res.json(serverErrorResponse("Failed to create employer profile"));
    }
});


// Get all companies
const getAllCompanies = asyncHandler(async (req, res) => {
    try {
        const companies = await Employer.find().populate({
            path: 'userId',
            select: 'fullName email phone profilePicture'
        });
        
        if (!companies || companies.length === 0) {
            return res.json(notFoundResponse("No companies found."));
        }
        
        return res.json(successResponse(companies, "Companies fetched successfully."));
    } catch (error) {
        console.error("Error in getAllCompanies:", error);
        return res.json(serverErrorResponse("Failed to fetch companies"));
    }
});


// Get a my company 
const getCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Validate user ID
        if (!userId) {
            return res.json(badRequestResponse("User ID not provided or there is some issue in it"));
        }
        
        // Find company profile for the authenticated user
        const company = await Employer.findOne({ userId: userId })
            .populate({ path: 'userId', select: 'fullName email phone profilePicture' });
            
        if (!company) {
            return res.json(notFoundResponse("Company profile not found. Please create your company profile first."));
        }
        
        // Structure the response data properly
        const companyData = {
            _id: company._id,
            name: company.name,
            companySize: company.companySize,
            industry: company.industry,
            websiteLink: company.websiteLink,
            userId: company.userId._id,
            userDetails: {
                fullName: company.userId.fullName,
                email: company.userId.email,
                phone: company.userId.phone,
                profilePicture: company.userId.profilePicture
            },
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };
        
        return res.json(successResponse(companyData, "Company profile fetched successfully."));
    } catch (error) {
        console.error("Error in getCompanyProfile:", error);
        return res.json(serverErrorResponse("Failed to fetch company profile"));
    }
});


// Get a company by ID
const getCompanyById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.json(badRequestResponse("Company ID is required."));
        }
        
        const company = await Employer.findById(id).populate({
            path: 'userId',
            select: 'fullName email phone profilePicture'
        });
        
        if (!company) {
            return res.json(notFoundResponse("Company not found."));
        }
        
        // Structure the response data properly
        const companyData = {
            _id: company._id,
            name: company.name,
            description: company.description,
            companySize: company.companySize,
            industry: company.industry,
            websiteLink: company.websiteLink,
            location: company.location,
            establishedYear: company.establishedYear,
            verified: company.verified,
            totalEmployees: company.totalEmployees,
            userId: company.userId._id,
            userDetails: {
                fullName: company.userId.fullName,
                email: company.userId.email,
                phone: company.userId.phone,
                profilePicture: company.userId.profilePicture
            },
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };
        
        return res.json(successResponse(companyData, "Company fetched successfully."));
    } catch (error) {
        console.error("Error in getCompanyById:", error);
        return res.json(serverErrorResponse("Failed to fetch company"));
    }
});


// Update company details
const updateCompanyDetails = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        if (!id) {
            return res.json(badRequestResponse("Company ID is required."));
        }
        
        // Only allow owner to update
        const company = await Employer.findById(id);
        if (!company) {
            return res.json(notFoundResponse("Company not found."));
        }
        
        if (company.userId.toString() !== req.user._id.toString()) {
            return res.json(forbiddenResponse("You are not authorized to update this company profile."));
        }
        
        // Validate and sanitize fields
        if (updates.name) updates.name = updates.name.trim();
        if (updates.description) updates.description = updates.description.trim();
        if (updates.companySize) updates.companySize = updates.companySize.trim();
        if (updates.industry) updates.industry = updates.industry.trim();
        if (updates.websiteLink) updates.websiteLink = updates.websiteLink.trim();
        if (updates.location) updates.location = updates.location.trim();
        
        // Validate websiteLink if provided
        if (updates.websiteLink && !/^https?:\/\/.+/.test(updates.websiteLink)) {
            return res.json(badRequestResponse("Website URL must be valid (start with http:// or https://)"));
        }
        
        // Validate companySize if provided
        const validSizes = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];
        if (updates.companySize && !validSizes.includes(updates.companySize)) {
            return res.json(badRequestResponse(`Company size must be one of: ${validSizes.join(", ")}`));
        }
        
        const updatedCompany = await Employer.findByIdAndUpdate(id, updates, { 
            new: true, 
            runValidators: true 
        }).populate({
            path: 'userId',
            select: 'fullName email phone profilePicture'
        });
        
        // Structure the response data properly
        const companyData = {
            _id: updatedCompany._id,
            name: updatedCompany.name,
            description: updatedCompany.description,
            companySize: updatedCompany.companySize,
            industry: updatedCompany.industry,
            websiteLink: updatedCompany.websiteLink,
            location: updatedCompany.location,
            establishedYear: updatedCompany.establishedYear,
            verified: updatedCompany.verified,
            totalEmployees: updatedCompany.totalEmployees,
            userId: updatedCompany.userId._id,
            userDetails: {
                fullName: updatedCompany.userId.fullName,
                email: updatedCompany.userId.email,
                phone: updatedCompany.userId.phone,
                profilePicture: updatedCompany.userId.profilePicture
            },
            createdAt: updatedCompany.createdAt,
            updatedAt: updatedCompany.updatedAt
        };
        
        return res.json(successResponse(companyData, "Company profile updated successfully."));
    } catch (error) {
        console.error("Error in updateCompanyDetails:", error);
        return res.json(serverErrorResponse("Failed to update company profile"));
    }
});

// Delete company profile and related jobs
const deleteCompanyProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return res.json(badRequestResponse("Company ID is required."));
        }
        
        const company = await Employer.findById(id);
        if (!company) {
            return res.json(notFoundResponse("Company not found."));
        }
        
        if (company.userId.toString() !== req.user._id.toString()) {
            return res.json(forbiddenResponse("You are not authorized to delete this company profile."));
        }
        
        // Delete all jobs posted by this employer
        try {
            const { Job } = await import('../models/index.js');
            await Job.deleteMany({ postedBy: req.user._id });
        } catch (jobDeleteError) {
            console.error("Error deleting jobs:", jobDeleteError);
            // Continue with company deletion even if job deletion fails
        }
        
        await Employer.findByIdAndDelete(id);
        
        return res.json(successResponse(null, "Company profile and related jobs deleted successfully."));
    } catch (error) {
        console.error("Error in deleteCompanyProfile:", error);
        return res.json(serverErrorResponse("Failed to delete company profile"));
    }
});

// Export controllers
export {
    creatCompanyProfile,
    getAllCompanies,
    getCompanyProfile,
    getCompanyById,
    updateCompanyDetails,
    deleteCompanyProfile
};