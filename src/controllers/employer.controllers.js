import { TrainingInstitute , Employer , User, Job, Student } from "../models/index.js";
import { successResponse ,createdResponse, badRequestResponse ,notFoundResponse, serverErrorResponse, forbiddenResponse ,conflictResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { 
    calculateMatchPercentage, 
    findMatchingStudents, 
    filterByMatchPercentage,
    fuzzyTextSearch,
    fuzzyFilter 
} from "./jobs.controllers.js";


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


// Get all companies with enhanced fuzzy filtering
const getAllCompanies = asyncHandler(async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            industry, 
            companySize, 
            location, 
            search // New search parameter for fuzzy search
        } = req.query;
        
        // Build base query
        let query = {};
        
        // Apply fuzzy filters for industry, location if provided
        if (industry) {
            // Use fuzzy matching for industry
            const allCompanies = await Employer.find().select('industry');
            const fuzzyIndustryMatches = fuzzyFilter(allCompanies, { industry }, 0.7);
            const matchedIds = fuzzyIndustryMatches.map(company => company._id);
            
            if (matchedIds.length > 0) {
                query._id = { $in: matchedIds };
            } else {
                // Fallback to exact match if no fuzzy matches
                query.industry = new RegExp(industry, 'i');
            }
        }
        
        if (companySize) {
            query.companySize = companySize;
        }
        
        if (location) {
            // Use fuzzy matching for location
            query.location = new RegExp(location, 'i');
        }
        
        // Get companies with the query
        let companies = await Employer.find(query).populate({
            path: 'userId',
            select: 'fullName email phone profilePicture'
        });
        
        // Apply fuzzy text search if search parameter is provided
        if (search && search.trim() !== '') {
            const searchFields = ['name', 'industry', 'location', 'description'];
            companies = fuzzyTextSearch(companies, search, searchFields, 0.6);
        }
        
        if (!companies || companies.length === 0) {
            return res.json(notFoundResponse("No companies found matching the criteria."));
        }
        
        // Pagination
        const totalCompanies = companies.length;
        const totalPages = Math.ceil(totalCompanies / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + Number(limit);
        const paginatedCompanies = companies.slice(startIndex, endIndex);
        
        const responseData = {
            companies: paginatedCompanies,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalCompanies,
                limit: Number(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                industry: industry || null,
                companySize: companySize || null,
                location: location || null,
                search: search || null
            }
        };
        
        return res.json(successResponse(responseData, "Companies fetched successfully."));
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

/**
 * Get all matched candidates (≥90% match) for the logged-in employer across all their jobs
 * GET /api/employers/my-matched-candidates
 */
const getMatchedCandidates = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, sortBy = 'matchPercentage', sortOrder = 'desc' } = req.query;
        const userId = req.user._id;
        
        // Find employer profile for the logged-in user
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(notFoundResponse("Employer profile not found. Please create your employer profile first."));
        }
        
        // Get all jobs posted by this employer
        const employerJobs = await Job.find({ 
            postedBy: employer._id, // Use employer ID, not user ID
            isActive: true 
        }).select('_id jobTitle matchedCandidates skillsRequired');
        
        // Process all jobs to ensure they have up-to-date matches
        await Promise.all(employerJobs.map(async (job) => {
            // Always recalculate matches for all jobs to ensure fresh data
            if (job.skillsRequired && Array.isArray(job.skillsRequired) && job.skillsRequired.length > 0) {
                console.log(`Calculating matches for job: ${job.jobTitle}`);
                
                // Get all active students
                const students = await Student.find({
                    skills: { $exists: true, $ne: [] },
                    isPublic: true,
                    isOpenToWork: true
                }).select('skills firstName lastName email location');
                
                // Find matching students with ≥90% match
                const skillNameMatchingOptions = {
                    fuzzyThreshold: 0.85,
                    exactMatchWeight: 1.0,
                    abbreviationMatchWeight: 0.98,
                    partialMatchWeight: 0.85,
                    fuzzyMatchWeight: 0.6
                };
                const matchedStudents = findMatchingStudents(students, job.skillsRequired, 90, skillNameMatchingOptions);
                
                // Format matched candidates for storage
                const formattedMatches = matchedStudents.map(match => ({
                    student: match.student,
                    matchPercentage: match.matchPercentage,
                    matchedAt: new Date()
                }));
                
                // Update the job with matched candidates
                await Job.findByIdAndUpdate(job._id, {
                    matchedCandidates: formattedMatches
                });
                
                // Update the job object in our array for immediate use
                job.matchedCandidates = formattedMatches;
                
                console.log(`Updated job ${job.jobTitle} with ${formattedMatches.length} matches`);
            }
        }));
        
        if (!employerJobs || employerJobs.length === 0) {
            return res.json(successResponse(
                {
                    candidates: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalCandidates: 0,
                        limit: Number(limit)
                    }
                },
                "No active jobs found for this employer."
            ));
        }
        
        // Collect all matched candidates from all jobs (≥90% match)
        const allMatchedCandidates = [];
        const candidateMap = new Map(); // To avoid duplicates
        
        for (const job of employerJobs) {
            if (job.matchedCandidates && job.matchedCandidates.length > 0) {
                for (const match of job.matchedCandidates) {
                    // Only include candidates with ≥90% match
                    if (match.matchPercentage >= 95) {
                        const candidateId = match.student.toString();
                        
                        // If candidate already exists, keep the higher match percentage
                        if (candidateMap.has(candidateId)) {
                            const existing = candidateMap.get(candidateId);
                            if (match.matchPercentage > existing.matchPercentage) {
                                existing.matchPercentage = match.matchPercentage;
                                existing.jobTitle = job.jobTitle;
                                existing.jobId = job._id;
                            }
                        } else {
                            candidateMap.set(candidateId, {
                                student: match.student,
                                matchPercentage: match.matchPercentage,
                                jobTitle: job.jobTitle,
                                jobId: job._id,
                                matchedAt: match.matchedAt
                            });
                        }
                    }
                }
            }
        }
        
        // Convert map to array
        const uniqueCandidates = Array.from(candidateMap.values());
        
        // Sort candidates
        const validSortFields = ['matchPercentage', 'matchedAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'matchPercentage';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        
        uniqueCandidates.sort((a, b) => {
            if (sortField === 'matchPercentage') {
                return (b.matchPercentage - a.matchPercentage) * sortDirection;
            } else if (sortField === 'matchedAt') {
                return (new Date(b.matchedAt) - new Date(a.matchedAt)) * sortDirection;
            }
            return 0;
        });
        
        // Pagination
        const totalCandidates = uniqueCandidates.length;
        const totalPages = Math.ceil(totalCandidates / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + Number(limit);
        const paginatedCandidates = uniqueCandidates.slice(startIndex, endIndex);
        
        // Populate student details
        const studentIds = paginatedCandidates.map(candidate => candidate.student);
        const students = await Student.find({ 
            _id: { $in: studentIds } 
        }).select('firstName lastName email location skills bio isOpenToWork')
          .populate('userId', 'profilePicture');
        
        // Merge student data with match data
        const candidatesWithDetails = paginatedCandidates.map(candidate => {
            const student = students.find(s => s._id.toString() === candidate.student.toString());
            return {
                studentId: candidate.student,
                studentDetails: student,
                matchPercentage: candidate.matchPercentage,
                jobTitle: candidate.jobTitle,
                jobId: candidate.jobId,
                matchedAt: candidate.matchedAt
            };
        });
        
        const responseData = {
            candidates: candidatesWithDetails,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalCandidates,
                limit: Number(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            summary: {
                totalJobs: employerJobs.length,
                candidatesCount: totalCandidates,
                averageMatch: totalCandidates > 0 ? 
                    Math.round((uniqueCandidates.reduce((sum, c) => sum + c.matchPercentage, 0) / totalCandidates) * 100) / 100 : 0
            }
        };
        
        return res.json(successResponse(responseData, "Matched candidates retrieved successfully."));
        
    } catch (error) {
        console.error('Error getting matched candidates:', error);
        return res.json(serverErrorResponse("Failed to retrieve matched candidates."));
    }
});

/**
 * Get potential students (≥20% match) for the logged-in employer across all their jobs
 * GET /api/employers/my-potential-students
 */
const getPotentialStudents = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, minMatch = 20, maxMatch = 100, sortBy = 'matchPercentage', sortOrder = 'desc' } = req.query;
        const userId = req.user._id;
        
        // Find employer profile for the logged-in user
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(notFoundResponse("Employer profile not found. Please create your employer profile first."));
        }
        
        // Get all jobs posted by this employer
        const employerJobs = await Job.find({ 
            postedBy: employer._id, // Use employer ID, not user ID
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] }
        }).select('_id jobTitle skillsRequired');
        
        // Note: For potential students, we calculate matches on-the-fly anyway,
        // so legacy jobs are automatically included without needing special handling
        
        if (!employerJobs || employerJobs.length === 0) {
            return res.json(successResponse(
                {
                    students: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalStudents: 0,
                        limit: Number(limit)
                    }
                },
                "No active jobs with skill requirements found for this employer."
            ));
        }
        
        // Get all active students with skills
        const students = await Student.find({
            skills: { $exists: true, $ne: [] },
            isPublic: true,
            isOpenToWork: true
        }).select('firstName lastName email location skills bio')
          .populate('userId', 'profilePicture');
        
        if (!students || students.length === 0) {
            return res.json(successResponse(
                {
                    students: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalStudents: 0,
                        limit: Number(limit)
                    }
                },
                "No students with skills found."
            ));
        }
        
        // Calculate matches for each student against all employer jobs (with skill name-focused matching)
        const studentMatches = new Map();
        
        for (const student of students) {
            let bestMatch = 0;
            let bestJobTitle = '';
            let bestJobId = null;
            
            // Find the best match across all employer jobs (using skill name-focused matching)
            for (const job of employerJobs) {
                const skillNameMatchingOptions = {
                    fuzzyThreshold: 0.85, // Higher threshold for stricter matching
                    exactMatchWeight: 1.0,
                    abbreviationMatchWeight: 0.98, // High weight for abbreviations
                    partialMatchWeight: 0.85, // Good weight for partial skill name matches
                    fuzzyMatchWeight: 0.6 // Lower weight for fuzzy matches to prioritize exact names
                };
                const matchPercentage = calculateMatchPercentage(student.skills, job.skillsRequired, skillNameMatchingOptions);
                
                if (matchPercentage > bestMatch) {
                    bestMatch = matchPercentage;
                    bestJobTitle = job.jobTitle;
                    bestJobId = job._id;
                }
            }
            
            // Only include students with ≥20% and <90% match (potential students, not matched candidates)
            if (bestMatch >= minMatch && bestMatch <= maxMatch) {
                studentMatches.set(student._id.toString(), {
                    student: student,
                    matchPercentage: bestMatch,
                    jobTitle: bestJobTitle,
                    jobId: bestJobId
                });
            }
        }
        
        // Convert to array and sort
        let potentialStudents = Array.from(studentMatches.values());
        
        // Sort students
        const validSortFields = ['matchPercentage', 'firstName', 'lastName'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'matchPercentage';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        
        potentialStudents.sort((a, b) => {
            if (sortField === 'matchPercentage') {
                return (b.matchPercentage - a.matchPercentage) * sortDirection;
            } else if (sortField === 'firstName' || sortField === 'lastName') {
                const aValue = a.student[sortField] || '';
                const bValue = b.student[sortField] || '';
                return aValue.localeCompare(bValue) * sortDirection;
            }
            return 0;
        });
        
        // Pagination
        const totalStudents = potentialStudents.length;
        const totalPages = Math.ceil(totalStudents / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + Number(limit);
        const paginatedStudents = potentialStudents.slice(startIndex, endIndex);
        
        // Format response data
        const studentsWithDetails = paginatedStudents.map(match => ({
            studentId: match.student._id,
            studentDetails: {
                firstName: match.student.firstName,
                lastName: match.student.lastName,
                email: match.student.email,
                location: match.student.location,
                skills: match.student.skills,
                bio: match.student.bio,
                profilePicture: match.student.userId?.profilePicture
            },
            matchPercentage: match.matchPercentage,
            bestMatchJob: {
                title: match.jobTitle,
                id: match.jobId
            }
        }));
        
        const responseData = {
            students: studentsWithDetails,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalStudents,
                limit: Number(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                minMatch: Number(minMatch),
                maxMatch: Number(maxMatch),
                sortBy,
                sortOrder
            },
            summary: {
                totalJobs: employerJobs.length,
                studentsCount: totalStudents,
                averageMatch: totalStudents > 0 ? 
                    Math.round((potentialStudents.reduce((sum, s) => sum + s.matchPercentage, 0) / totalStudents) * 100) / 100 : 0
            }
        };
        
        return res.json(successResponse(responseData, "Potential students retrieved successfully."));
        
    } catch (error) {
        console.error('Error getting potential students:', error);
        return res.json(serverErrorResponse("Failed to retrieve potential students."));
    }
});

/**
 * Admin endpoint: Get matched candidates for any employer by ID
 * GET /api/employers/:id/matched-candidates (Admin only)
 */
const getEmployerMatchedCandidatesById = asyncHandler(async (req, res) => {
    try {
        const { id: employerId } = req.params;
        const { page = 1, limit = 10, sortBy = 'matchPercentage', sortOrder = 'desc' } = req.query;
        
        // Validate employer exists
        const employer = await Employer.findById(employerId);
        if (!employer) {
            return res.json(notFoundResponse("Employer not found."));
        }
        
        // Get all jobs posted by this employer
        const employerJobs = await Job.find({ 
            postedBy: employer._id, // Use employer ID, not user ID
            isActive: true 
        }).select('_id jobTitle matchedCandidates skillsRequired');
        
        if (!employerJobs || employerJobs.length === 0) {
            return res.json(successResponse(
                {
                    candidates: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalCandidates: 0,
                        limit: Number(limit)
                    }
                },
                "No active jobs found for this employer."
            ));
        }
        
        // Collect all matched candidates from all jobs (≥90% match)
        const allMatchedCandidates = [];
        const candidateMap = new Map(); // To avoid duplicates
        
        for (const job of employerJobs) {
            if (job.matchedCandidates && job.matchedCandidates.length > 0) {
                for (const match of job.matchedCandidates) {
                    // Only include candidates with ≥90% match
                    if (match.matchPercentage >= 95) {
                        const candidateId = match.student.toString();
                        
                        // If candidate already exists, keep the higher match percentage
                        if (candidateMap.has(candidateId)) {
                            const existing = candidateMap.get(candidateId);
                            if (match.matchPercentage > existing.matchPercentage) {
                                existing.matchPercentage = match.matchPercentage;
                                existing.jobTitle = job.jobTitle;
                                existing.jobId = job._id;
                            }
                        } else {
                            candidateMap.set(candidateId, {
                                student: match.student,
                                matchPercentage: match.matchPercentage,
                                jobTitle: job.jobTitle,
                                jobId: job._id,
                                matchedAt: match.matchedAt
                            });
                        }
                    }
                }
            }
        }
        
        // Convert map to array
        const uniqueCandidates = Array.from(candidateMap.values());
        
        // Sort candidates
        const validSortFields = ['matchPercentage', 'matchedAt'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'matchPercentage';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        
        uniqueCandidates.sort((a, b) => {
            if (sortField === 'matchPercentage') {
                return (b.matchPercentage - a.matchPercentage) * sortDirection;
            } else if (sortField === 'matchedAt') {
                return (new Date(b.matchedAt) - new Date(a.matchedAt)) * sortDirection;
            }
            return 0;
        });
        
        // Pagination
        const totalCandidates = uniqueCandidates.length;
        const totalPages = Math.ceil(totalCandidates / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + Number(limit);
        const paginatedCandidates = uniqueCandidates.slice(startIndex, endIndex);
        
        // Populate student details
        const studentIds = paginatedCandidates.map(candidate => candidate.student);
        const students = await Student.find({ 
            _id: { $in: studentIds } 
        }).select('firstName lastName email location skills bio isOpenToWork')
          .populate('userId', 'profilePicture');
        
        // Merge student data with match data
        const candidatesWithDetails = paginatedCandidates.map(candidate => {
            const student = students.find(s => s._id.toString() === candidate.student.toString());
            return {
                studentId: candidate.student,
                studentDetails: student,
                matchPercentage: candidate.matchPercentage,
                jobTitle: candidate.jobTitle,
                jobId: candidate.jobId,
                matchedAt: candidate.matchedAt
            };
        });
        
        const responseData = {
            employer: {
                id: employer._id,
                name: employer.name,
                industry: employer.industry
            },
            candidates: candidatesWithDetails,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalCandidates,
                limit: Number(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            summary: {
                totalJobs: employerJobs.length,
                candidatesCount: totalCandidates,
                averageMatch: totalCandidates > 0 ? 
                    Math.round((uniqueCandidates.reduce((sum, c) => sum + c.matchPercentage, 0) / totalCandidates) * 100) / 100 : 0
            }
        };
        
        return res.json(successResponse(responseData, "Matched candidates retrieved successfully."));
        
    } catch (error) {
        console.error('Error getting matched candidates:', error);
        return res.json(serverErrorResponse("Failed to retrieve matched candidates."));
    }
});

/**
 * Admin endpoint: Get potential students for any employer by ID
 * GET /api/employers/:id/potential-students (Admin only)
 */
const getEmployerPotentialStudentsById = asyncHandler(async (req, res) => {
    try {
        const { id: employerId } = req.params;
        const { page = 1, limit = 10, minMatch = 20, maxMatch = 94, sortBy = 'matchPercentage', sortOrder = 'desc' } = req.query;
        
        // Validate employer exists
        const employer = await Employer.findById(employerId);
        if (!employer) {
            return res.json(notFoundResponse("Employer not found."));
        }
        
        // Get all jobs posted by this employer
        const employerJobs = await Job.find({ 
            postedBy: employer._id, // Use employer ID, not user ID
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] }
        }).select('_id jobTitle skillsRequired');
        
        if (!employerJobs || employerJobs.length === 0) {
            return res.json(successResponse(
                {
                    students: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalStudents: 0,
                        limit: Number(limit)
                    }
                },
                "No active jobs with skill requirements found for this employer."
            ));
        }
        
        // Get all active students with skills
        const students = await Student.find({
            skills: { $exists: true, $ne: [] },
            isPublic: true,
            isOpenToWork: true
        }).select('firstName lastName email location skills bio')
          .populate('userId', 'profilePicture');
        
        if (!students || students.length === 0) {
            return res.json(successResponse(
                {
                    students: [],
                    pagination: {
                        currentPage: 1,
                        totalPages: 0,
                        totalStudents: 0,
                        limit: Number(limit)
                    }
                },
                "No students with skills found."
            ));
        }
        
        // Calculate matches for each student against all employer jobs (with skill name-focused matching)
        const studentMatches = new Map();
        
        for (const student of students) {
            let bestMatch = 0;
            let bestJobTitle = '';
            let bestJobId = null;
            
            // Find the best match across all employer jobs (using skill name-focused matching)
            for (const job of employerJobs) {
                const skillNameMatchingOptions = {
                    fuzzyThreshold: 0.85, // Higher threshold for stricter matching
                    exactMatchWeight: 1.0,
                    abbreviationMatchWeight: 0.98, // High weight for abbreviations
                    partialMatchWeight: 0.85, // Good weight for partial skill name matches
                    fuzzyMatchWeight: 0.6 // Lower weight for fuzzy matches to prioritize exact names
                };
                const matchPercentage = calculateMatchPercentage(student.skills, job.skillsRequired, skillNameMatchingOptions);
                
                if (matchPercentage > bestMatch) {
                    bestMatch = matchPercentage;
                    bestJobTitle = job.jobTitle;
                    bestJobId = job._id;
                }
            }
            
            // Only include students with ≥20% and <90% match (potential students, not matched candidates)
            if (bestMatch >= minMatch && bestMatch <= maxMatch) {
                studentMatches.set(student._id.toString(), {
                    student: student,
                    matchPercentage: bestMatch,
                    jobTitle: bestJobTitle,
                    jobId: bestJobId
                });
            }
        }
        
        // Convert to array and sort
        let potentialStudents = Array.from(studentMatches.values());
        
        // Sort students
        const validSortFields = ['matchPercentage', 'firstName', 'lastName'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'matchPercentage';
        const sortDirection = sortOrder === 'asc' ? 1 : -1;
        
        potentialStudents.sort((a, b) => {
            if (sortField === 'matchPercentage') {
                return (b.matchPercentage - a.matchPercentage) * sortDirection;
            } else if (sortField === 'firstName' || sortField === 'lastName') {
                const aValue = a.student[sortField] || '';
                const bValue = b.student[sortField] || '';
                return aValue.localeCompare(bValue) * sortDirection;
            }
            return 0;
        });
        
        // Pagination
        const totalStudents = potentialStudents.length;
        const totalPages = Math.ceil(totalStudents / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + Number(limit);
        const paginatedStudents = potentialStudents.slice(startIndex, endIndex);
        
        // Format response data
        const studentsWithDetails = paginatedStudents.map(match => ({
            studentId: match.student._id,
            studentDetails: {
                firstName: match.student.firstName,
                lastName: match.student.lastName,
                email: match.student.email,
                location: match.student.location,
                skills: match.student.skills,
                bio: match.student.bio,
                profilePicture: match.student.userId?.profilePicture
            },
            matchPercentage: match.matchPercentage,
            bestMatchJob: {
                title: match.jobTitle,
                id: match.jobId
            }
        }));
        
        const responseData = {
            employer: {
                id: employer._id,
                name: employer.name,
                industry: employer.industry
            },
            students: studentsWithDetails,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalStudents,
                limit: Number(limit),
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            filters: {
                minMatch: Number(minMatch),
                maxMatch: Number(maxMatch),
                sortBy,
                sortOrder
            },
            summary: {
                totalJobs: employerJobs.length,
                studentsCount: totalStudents,
                averageMatch: totalStudents > 0 ? 
                    Math.round((potentialStudents.reduce((sum, s) => sum + s.matchPercentage, 0) / totalStudents) * 100) / 100 : 0
            }
        };
        
        return res.json(successResponse(responseData, "Potential students retrieved successfully."));
        
    } catch (error) {
        console.error('Error getting potential students:', error);
        return res.json(serverErrorResponse("Failed to retrieve potential students."));
    }
});

// Export controllers
export {
    creatCompanyProfile,
    getAllCompanies,
    getCompanyProfile,
    getCompanyById,
    updateCompanyDetails,
    deleteCompanyProfile,
    getMatchedCandidates,
    getPotentialStudents,
    getEmployerMatchedCandidatesById,
    getEmployerPotentialStudentsById
};