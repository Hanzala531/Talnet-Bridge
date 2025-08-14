import { TrainingInstitute } from '../models/index.js'
import { Course } from '../models/index.js'
import { internalServer } from '../utils/ApiError.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Get own profile controller
const getProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        const profile = await TrainingInstitute.findOne({ userId: userId });
        
        if (!profile) {
            return res.status(404).json({ 
                success: false,
                message: "Training provider profile not found" 
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Profile fetched successfully",
            data: profile
        });
    } catch (error) {
        throw internalServer("Failed to fetch profile");
    }
});

// Edit user profile 
const editProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const updates = req.body;
        
        // Validate required fields if provided
        if (updates.about && updates.about.length > 1000) {
            return res.status(400).json({
                success: false,
                message: "About section cannot exceed 1000 characters"
            });
        }
        
        const updatedProfile = await TrainingInstitute.findOneAndUpdate(
            { userId: userId },
            updates,
            { new: true, runValidators: true }
        );
        
        if (!updatedProfile) {
            return res.status(404).json({
                success: false,
                message: "Profile not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedProfile
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: Object.values(error.errors).map(e => e.message)
            });
        }
        throw internalServer("Failed to update profile");
    }
});

// Get all training providers
const getAllTrainingProviders = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, focusArea, location } = req.query;
        
        const filter = {};
        if (focusArea) {
            filter.focusAreas = { $in: [new RegExp(focusArea, 'i')] };
        }
        if (location) {
            filter['location.city'] = { $regex: location, $options: 'i' };
        }
        
        const skip = (page - 1) * limit;
        const providers = await TrainingInstitute.find(filter)
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        
        if (!providers || providers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No training providers found"
            });
        }
        
        const total = await TrainingInstitute.countDocuments(filter);
        
        res.status(200).json({
            success: true,
            data: providers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        throw internalServer("Failed to fetch training providers");
    }
});

// Get training provider by ID
const getTrainingProviderById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        const provider = await TrainingInstitute.findById(id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Training provider not found"
            });
        }
        
        // Get courses offered by this provider
        const courses = await Course.find({ trainingProvider: provider.userId })
            .select('title instructor duration price category status')
            .limit(5);
        
        res.status(200).json({
            success: true,
            data: {
                ...provider.toObject(),
                courses
            }
        });
    } catch (error) {
        throw internalServer("Failed to fetch training provider");
    }
});

// Search training providers
const searchTrainingProviders = asyncHandler(async (req, res) => {
    try {
        const { q, focusArea, city, page = 1, limit = 10 } = req.query;
        
        if (!q) {
            return res.status(400).json({
                success: false,
                message: "Search query is required"
            });
        }
        
        const searchFilter = {
            $or: [
                { about: { $regex: q, $options: 'i' } },
                { focusAreas: { $in: [new RegExp(q, 'i')] } },
                { 'location.city': { $regex: q, $options: 'i' } },
                { 'location.state': { $regex: q, $options: 'i' } }
            ]
        };
        
        // Add additional filters
        if (focusArea) {
            searchFilter.focusAreas = { $in: [new RegExp(focusArea, 'i')] };
        }
        
        if (city) {
            searchFilter['location.city'] = { $regex: city, $options: 'i' };
        }
        
        const skip = (page - 1) * limit;
        const providers = await TrainingInstitute.find(searchFilter)
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        
        const total = await TrainingInstitute.countDocuments(searchFilter);
        
        res.status(200).json({
            success: true,
            data: providers,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        throw internalServer("Failed to search training providers");
    }
});

// Update training provider status (Admin only)
const updateTrainingProviderStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const validStatuses = ["active", "inactive", "suspended"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value. Valid values are: active, inactive, suspended"
            });
        }
        
        const provider = await TrainingInstitute.findByIdAndUpdate(
            id,
            { status },
            { new: true }
        );
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Training provider not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Training provider status updated successfully",
            data: provider
        });
    } catch (error) {
        throw internalServer("Failed to update training provider status");
    }
});

// Delete training provider (Admin only)
const deleteTrainingProvider = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        const provider = await TrainingInstitute.findByIdAndDelete(id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Training provider not found"
            });
        }
        
        // Also delete associated courses
        await Course.deleteMany({ trainingProvider: provider.userId });
        
        res.status(200).json({
            success: true,
            message: "Training provider and associated courses deleted successfully"
        });
    } catch (error) {
        throw internalServer("Failed to delete training provider");
    }
});

// Get training provider statistics
const getTrainingProviderStats = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Get provider profile
        const provider = await TrainingInstitute.findOne({ userId });
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: "Training provider profile not found"
            });
        }
        
        // Get course statistics
        const totalCourses = await Course.countDocuments({ trainingProvider: userId });
        const activeCourses = await Course.countDocuments({ 
            trainingProvider: userId, 
            status: 'approved' 
        });
        const pendingCourses = await Course.countDocuments({ 
            trainingProvider: userId, 
            status: 'pending_approval' 
        });
        
        // Get course categories breakdown
        const coursesByCategory = await Course.aggregate([
            { $match: { trainingProvider: userId } },
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        
        res.status(200).json({
            success: true,
            data: {
                provider: {
                    id: provider._id,
                    status: provider.status,
                    established: provider.established,
                    focusAreas: provider.focusAreas
                },
                courses: {
                    total: totalCourses,
                    active: activeCourses,
                    pending: pendingCourses,
                    byCategory: coursesByCategory
                }
            }
        });
    } catch (error) {
        throw internalServer("Failed to fetch training provider statistics");
    }
});

export { 
    getProfile, 
    editProfile, 
    getAllTrainingProviders, 
    getTrainingProviderById, 
    searchTrainingProviders, 
    updateTrainingProviderStatus, 
    deleteTrainingProvider, 
    getTrainingProviderStats 
};