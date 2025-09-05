/**
 * JOB CONTROLLERS
 * 
 * This module handles all job-related operations for the TalentBridge platform.
 * Employers can post, manage, and track job listings while job seekers can
 * browse and apply for positions.
 * 
 * Features:
 * - Job posting and management (CRUD operations)
 * - Advanced job search and filtering
 * - Job application tracking
 * - Employer dashboard analytics
 * - Job status management (active, expired, closed)
 * 
 * Roles:
 * - Employers: Can create, update, delete their own job posts
 * - Students: Can view and apply for jobs
 * - Admin: Full access to all job operations
 */

import { Job, Student, Employer } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer, forbidden } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from "../utils/ApiResponse.js";
import { User } from "../models/contents/User.models.js";
import { createBulkNotifications } from "../services/notification.service.js";
import { sendRealTimeNotification } from "../services/notification.service.js";



// Get all job posts
const getAllJobs = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, status, location, employmentType, sort = '-createdAt' } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (location) filter.location = { $regex: location, $options: 'i' };
        if (employmentType) filter.employmentType = employmentType;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        // Use aggregation for better performance
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "employers",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "employer",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo",
                                pipeline: [{ $project: { fullName: 1, email: 1, role: 1 } }]
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                industry: 1,
                                location: 1,
                                userInfo: { $arrayElemAt: ["$userInfo", 0] }
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    jobTitle: 1,
                    department: 1,
                    location: 1,
                    employmentType: 1,
                    salary: 1,
                    category: 1,
                    applicationDeadline: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    postedBy: { $arrayElemAt: ["$employer", 0] }
                }
            },
            { $sort: sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 } },
            { $skip: skip },
            { $limit: limitNum }
        ];

        const [jobs, total] = await Promise.all([
            Job.aggregate(pipeline),
            Job.countDocuments(filter)
        ]);

        if (!jobs || jobs.length === 0) {
            return res.json(notFoundResponse("No jobs found."));
        }

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Jobs fetched successfully."
            )
        );
    } catch (error) {
        throw internalServer("Error in fetching jobs");
    }
});

// Get a job by ID
const getJobById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        const job = await Job.findById(id).populate({
            path: 'postedBy',
            populate: {
                path: 'userId',
                select: 'fullName email role'
            }
        });
        if (!job) return res.json(notFoundResponse("Job not found."));
        return res.json(successResponse(job, "Job fetched successfully."));
    } catch (error) {
       throw internalServer(error.message);
    }
});

// Create a job post
// Create job post with automatic candidate matching
const createJobPost = asyncHandler(async (req, res) => {
    try {
        const { jobTitle, department, location, employmentType, salary, jobDescription, skillsRequired, benefits, category, applicationDeadline } = req.body;
        const userId = req.user?._id;
        
        if (!jobTitle || !department || !location || !employmentType || !jobDescription || !category) {
            return res.json(badRequestResponse("Missing required fields: jobTitle, department, location, employmentType, jobDescription, category"));
        }
        
        // Validate that user has an employer profile
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(badRequestResponse("Employer profile required. Please create your employer profile first before posting jobs."));
        }
        
        // Create the job with employer ID as postedBy
        const job = await Job.create({
            jobTitle,
            department,
            location,
            employmentType,
            salary,
            jobDescription,
            skillsRequired,
            benefits,
            postedBy: employer._id, // Use employer ID, not user ID
            category,
            applicationDeadline,
            status : "active",
            matchedCandidates: [] // Initialize empty array
        });
        
        if (!job) throw internalServer("Failed to create job");
        
        // Find and store matched candidates (≥95% match) if skills are provided
        if (skillsRequired && Array.isArray(skillsRequired) && skillsRequired.length > 0) {
            try {
                // Fetch all active students with skills
                const students = await Student.find({
                    skills: { $exists: true, $ne: [] },
                    isPublic: true, // Only consider public profiles
                    isOpenToWork: true // Only consider students open to work
                }).select('skills firstName lastName email location');
                
            
                
                // Define matching options first
                const skillNameMatchingOptions = {
                    fuzzyThreshold: 0.85, // Higher threshold for stricter matching
                    exactMatchWeight: 1.0,
                    abbreviationMatchWeight: 0.98, // High weight for abbreviations
                    partialMatchWeight: 0.85, // Good weight for partial skill name matches
                    fuzzyMatchWeight: 0.6 // Lower weight for fuzzy matches to prioritize exact names
                };
                
                // Debug each student's match percentage
                for (let i = 0; i < Math.min(students.length, 3); i++) {
                    const student = students[i];
                    const matchPercentage = calculateMatchPercentage(student.skills, skillsRequired, skillNameMatchingOptions);
                    console.log(`Student ${i + 1} (${student.firstName} ${student.lastName}): ${student.skills} -> ${matchPercentage}%`);
                }
                
                // Find matching students with ≥20% match (store all potential matches)
                const matchedStudents = findMatchingStudents(students, skillsRequired, 20, skillNameMatchingOptions);

                // Send real-time notifications to matched students
                matchedStudents.forEach(match => {
                    const notificationData = {
                        title: "New Job Match",
                        message: `You have a new job match for "${jobTitle}" with a ${match.matchPercentage}% skill match.`,
                        type: "job_matched",
                        relatedEntity: {
                            entityType: "job",
                            entityId: job._id,
                        },
                        actionUrl: `/jobs/${job._id}`,
                        priority: "normal",
                        metadata: {
                            jobId: job._id,
                            jobTitle: jobTitle,
                            employerId: employer._id,
                            company: employer.name,
                            location,
                        },
                    };
                    sendRealTimeNotification(match.student, notificationData);
                });

                // Format matched candidates for storage
                const formattedMatches = matchedStudents.map(match => ({
                    student: match.student,
                    matchPercentage: match.matchPercentage,
                    matchedAt: new Date()
                }));
                
                // Update job with matched candidates
                await Job.findByIdAndUpdate(job._id, {
                    matchedCandidates: formattedMatches
                });
                
            
                
            } catch (matchingError) {
                console.error('Error finding matched candidates:', matchingError);
                console.error('Error stack:', matchingError.stack);
                // Don't fail job creation if matching fails
            }
        } else {
            console.log('No skills required for this job - skipping candidate matching');
        }
        
        // Fetch the updated job with populated matched candidates
        const populatedJob = await Job.findById(job._id)
            .populate('matchedCandidates.student', 'firstName lastName email location skills')
            .populate({
                path: 'postedBy',
                populate: {
                    path: 'userId',
                    select: 'fullName email'
                }
            });
        
        // Notify schools about the new job posting
        const schools = await User.find({ role: 'school' }).select('_id').lean();
        const schoolIds = schools.map(school => school._id.toString());

        if (schoolIds.length > 0) {
            // Create notification data
            const notificationData = {
                title: "New Job Opportunity",
                message: `A new job "${jobTitle}" has been posted by ${req.user.fullName || 'an employer'}. Check it out and encourage your students to apply!`,
                type: "job_posted",
                relatedEntity: {
                    entityType: "job",
                    entityId: job._id,
                },
                actionUrl: `/jobs/${job._id}`,
                priority: "normal",
                metadata: {
                    jobId: job._id,
                    jobTitle: jobTitle,
                    employerId: employer._id,
                    company: employer.name,
                    location,
                },
            };

            // Get all school user IDs
            const schoolUsers = await User.find({ role: "school" }).select("_id").lean();
            const schoolUserIds = schoolUsers.map(user => user._id.toString());

            // Send notifications to all school users
            const notifications = await createBulkNotifications(schoolUserIds, notificationData);

            // Optionally, send real-time notifications
            if (notifications.length > 0 && req.app.get('io')) {
                const io = req.app.get('io');
                notifications.forEach(notification => {
                    sendRealTimeNotification(io, notification.recipient, notification);
                });
            }

            console.log(`Sent job creation notifications to ${notifications.length} schools.`);
        } else {
            console.warn('No schools found to notify about the new job.');
        }
        
        return res.json(createdResponse(populatedJob, "Job created successfully with matched candidates."));
        
    } catch (error) {
        throw internalServer(error.message);
    }
});

// Update job post
const updateJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user._id;
        
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        
        // Find the job with employer info
        const job = await Job.findById(id).populate('postedBy');
        if (!job) return res.json(notFoundResponse("Job not found."));
        
        // Validate that user owns this employer profile
        if (job.postedBy.userId.toString() !== userId.toString()) {
            return res.json(forbiddenResponse("You can only update your own job posts."));
        }
        
        const updated = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        return res.json(successResponse(updated, "Job updated successfully."));
    } catch (error) {
        throw internalServer(error.message);
    }
});

// Delete job post
const deleteJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        
        // Find the job with employer info
        const job = await Job.findById(id).populate('postedBy');
        if (!job) return res.json(notFoundResponse("Job not found or already deleted."));
        
        // Validate that user owns this employer profile
        if (job.postedBy.userId.toString() !== userId.toString()) {
            return res.json(forbiddenResponse("You can only delete your own job posts."));
        }
        
        await Job.findByIdAndDelete(id);
        return res.json(successResponse(null, "Job deleted successfully."));
    } catch (error) {
        throw internalServer(error.message)
    }
});

const searchJobs = asyncHandler(async (req, res) => {
    try {
        const { 
            q, 
            location, 
            category, 
            employmentType, 
            minSalary, 
            maxSalary, 
            skills,
            page = 1, 
            limit = 10 
        } = req.query;

        const filter = { status: 'active' };
        const searchConditions = [];

        if (q) {
            searchConditions.push(
                { jobTitle: { $regex: q, $options: 'i' } },
                { jobDescription: { $regex: q, $options: 'i' } },
                { department: { $regex: q, $options: 'i' } }
            );
        }

        if (searchConditions.length > 0) {
            filter.$or = searchConditions;
        }

        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }

        if (employmentType) {
            filter.employmentType = employmentType;
        }

        if (minSalary || maxSalary) {
            filter['salary.min'] = {};
            if (minSalary) filter['salary.min'].$gte = Number(minSalary);
            if (maxSalary) filter['salary.max'] = { $lte: Number(maxSalary) };
        }

        if (skills) {
            const skillsArray = skills.split(',').map(skill => skill.trim());
            filter.skillsRequired = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .populate({
                    path: 'postedBy',
                    populate: {
                        path: 'userId',
                        select: 'fullName email'
                    }
                })
                .select('-__v')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Job.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    },
                    searchParams: { q, location, category, employmentType, minSalary, maxSalary, skills }
                },
                "Job search completed successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to search jobs");
    }
});

const getMyJobs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;

        // Find employer profile for the logged-in user
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(badRequestResponse("Employer profile required. Please create your employer profile first."));
        }

        const filter = { postedBy: employer._id };
        if (status) filter.status = status;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .select('-__v')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .populate({
                    path: 'postedBy',
                    populate: {
                        path: 'userId',
                        select: 'fullName email'
                    }
                })
                .lean(),
            Job.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Your jobs retrieved successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to retrieve your jobs");
    }
});


const updateJobStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'closed', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.json(badRequestResponse("Invalid status. Must be one of: active, closed, expired"));
        }

        const job = await Job.findById(id);
        if (!job) {
            return res.json(notFoundResponse("Job not found"));
        }

        // Check authorization
        if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.json(forbiddenResponse("You are not authorized to update this job status"));
        }

        job.status = status;
        if (status === 'closed') {
            job.closedAt = new Date();
        }

        await job.save();

        return res.json(
            successResponse(
                { job: { _id: job._id, status: job.status, closedAt: job.closedAt } },
                `Job status updated to ${status} successfully`
            )
        );
    } catch (error) {throw internalServer(error.message);
    }
});

// ===============================================
// MATCHING UTILITIES FOR JOB CONTROLLERS
// ===============================================

/**
 * MATCHING UTILITIES
 * 
 * This module provides utility functions for calculating skill matches
 * between students and job requirements with fuzzy search capabilities.
 * 
 * Features:
 * - Calculate match percentage between student skills and job requirements
 * - Fuzzy search with typo tolerance and similarity scoring
 * - Support for case-insensitive matching
 * - Optimized for performance with large datasets
 */

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching to handle typos and similar spellings
 */
const calculateLevenshteinDistance = (str1, str2) => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) {
        matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j++) {
        matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1, // deletion
                matrix[j - 1][i] + 1, // insertion
                matrix[j - 1][i - 1] + indicator // substitution
            );
        }
    }
    
    return matrix[str2.length][str1.length];
};

/**
 * Calculate similarity score between two strings
 * Returns a score between 0 and 1 (1 being identical)
 */
const calculateSimilarity = (str1, str2) => {
    if (str1 === str2) return 1;
    
    const distance = calculateLevenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    
    return 1 - (distance / maxLength);
};

/**
 * Check if skills match with emphasis on skill name matching
 * @param {String} studentSkill - Student's skill
 * @param {String} jobSkill - Job requirement skill
 * @param {Number} fuzzyThreshold - Minimum similarity score (0-1) for fuzzy match
 * @returns {Object} - Match result with score and type
 */
const checkSkillMatch = (studentSkill, jobSkill, fuzzyThreshold = 0.85) => {
    const normalizedStudentSkill = studentSkill.toLowerCase().trim();
    const normalizedJobSkill = jobSkill.toLowerCase().trim();
    
    // Exact skill name match (highest priority)
    if (normalizedStudentSkill === normalizedJobSkill) {
        return { isMatch: true, score: 1.0, type: 'exact' };
    }
    
    // Check for common abbreviations and variations (high priority)
    const abbreviationMap = {
        'js': 'javascript',
        'javascript': 'js',
        'ts': 'typescript',
        'typescript': 'ts',
        'py': 'python',
        'python': 'py',
        'c#': 'csharp',
        'csharp': 'c#',
        'c++': 'cplusplus',
        'cplusplus': 'c++',
        'css3': 'css',
        'css': 'css3',
        'html5': 'html',
        'html': 'html5',
        'node': 'nodejs',
        'nodejs': 'node',
        'node.js': 'nodejs',
        'react': 'reactjs',
        'reactjs': 'react',
        'react.js': 'reactjs',
        'vue': 'vuejs',
        'vuejs': 'vue',
        'vue.js': 'vuejs',
        'angular': 'angularjs',
        'angularjs': 'angular',
        'ml': 'machine learning',
        'machine learning': 'ml',
        'ai': 'artificial intelligence',
        'artificial intelligence': 'ai',
        'db': 'database',
        'database': 'db',
        'sql': 'structured query language',
        'structured query language': 'sql',
        'mongodb': 'mongo',
        'mongo': 'mongodb',
        'postgresql': 'postgres',
        'postgres': 'postgresql',
        'express': 'expressjs',
        'expressjs': 'express',
        'express.js': 'expressjs'
    };
    
    // Check if either skill matches a known abbreviation
    const studentCanonical = abbreviationMap[normalizedStudentSkill] || normalizedStudentSkill;
    const jobCanonical = abbreviationMap[normalizedJobSkill] || normalizedJobSkill;
    
    if (studentCanonical === jobCanonical || 
        abbreviationMap[normalizedStudentSkill] === normalizedJobSkill || 
        abbreviationMap[normalizedJobSkill] === normalizedStudentSkill) {
        return { isMatch: true, score: 0.98, type: 'abbreviation' };
    }
    
    // Skill name contains check (medium priority)
    // This handles cases like "JavaScript ES6" containing "JavaScript"
    if (normalizedStudentSkill.includes(normalizedJobSkill) || normalizedJobSkill.includes(normalizedStudentSkill)) {
        const longerSkill = normalizedStudentSkill.length > normalizedJobSkill.length ? normalizedStudentSkill : normalizedJobSkill;
        const shorterSkill = normalizedStudentSkill.length <= normalizedJobSkill.length ? normalizedStudentSkill : normalizedJobSkill;
        
        // Calculate score based on how much of the skill name matches
        const score = shorterSkill.length / longerSkill.length;
        if (score >= 0.7) { // At least 70% of the skill name should match
            return { isMatch: true, score: 0.9 * score, type: 'partial' };
        }
    }
    
    // Fuzzy match for typos in skill names (lower priority)
    const similarity = calculateSimilarity(normalizedStudentSkill, normalizedJobSkill);
    if (similarity >= fuzzyThreshold) {
        return { isMatch: true, score: similarity * 0.8, type: 'fuzzy' };
    }
    
    return { isMatch: false, score: similarity, type: 'none' };
};

/**
 * Calculate the match percentage between student skills and job required skills with fuzzy search
 * @param {Array<String>} studentSkills - Array of student's skills
 * @param {Array<Object>} jobSkills - Array of job's required skills (objects with skill property)
 * @param {Object} options - Configuration options
 * @returns {Number} - Match percentage (0-100)
 */
const calculateMatchPercentage = (studentSkills, jobSkills, options = {}) => {
    try {
        const {
            fuzzyThreshold = 0.85, // Higher threshold for stricter matching
            exactMatchWeight = 1.0,
            abbreviationMatchWeight = 0.98, // High weight for abbreviations
            partialMatchWeight = 0.85, // Good weight for partial skill name matches
            fuzzyMatchWeight = 0.6 // Lower weight for fuzzy matches to prioritize exact names
        } = options;
        
        // Validate inputs
        if (!Array.isArray(studentSkills) || !Array.isArray(jobSkills)) {
            return 0;
        }
        
        if (studentSkills.length === 0 || jobSkills.length === 0) {
            return 0;
        }
        
        // Extract skill names from job requirements and normalize
        const jobSkillNames = jobSkills.map(skillObj => {
            if (typeof skillObj === 'string') {
                return skillObj.toLowerCase().trim();
            }
            return skillObj.skill ? skillObj.skill.toLowerCase().trim() : '';
        }).filter(skill => skill !== '');
        
        // Normalize student skills
        const normalizedStudentSkills = studentSkills.map(skill => 
            skill.toLowerCase().trim()
        ).filter(skill => skill !== '');
        
        if (jobSkillNames.length === 0 || normalizedStudentSkills.length === 0) {
            return 0;
        }
        
        // Calculate weighted match score
        let totalScore = 0;
        let matchedSkills = 0;
        
        for (const jobSkill of jobSkillNames) {
            let bestMatch = { isMatch: false, score: 0, type: 'none' };
            
            // Find the best matching student skill for this job requirement
            for (const studentSkill of normalizedStudentSkills) {
                const match = checkSkillMatch(studentSkill, jobSkill, fuzzyThreshold);
                
                if (match.isMatch && match.score > bestMatch.score) {
                    bestMatch = match;
                }
            }
            
            if (bestMatch.isMatch) {
                matchedSkills++;
                
                // Apply weights based on match type
                let weightedScore = bestMatch.score;
                switch (bestMatch.type) {
                    case 'exact':
                        weightedScore *= exactMatchWeight;
                        break;
                    case 'partial':
                        weightedScore *= partialMatchWeight;
                        break;
                    case 'fuzzy':
                        weightedScore *= fuzzyMatchWeight;
                        break;
                    case 'abbreviation':
                        weightedScore *= abbreviationMatchWeight;
                        break;
                }
                
                totalScore += weightedScore;
            }
        }
        
        // Calculate percentage based on job requirements
        const matchPercentage = (totalScore / jobSkillNames.length) * 100;
        
        // Round to 2 decimal places
        return Math.round(matchPercentage * 100) / 100;
        
    } catch (error) {
        console.error('Error calculating match percentage:', error);
        return 0;
    }
};

/**
 * Find matching students for a specific job based on skill names
 * @param {Array<Object>} students - Array of student objects with skills
 * @param {Array<Object>} jobSkills - Array of job's required skills
 * @param {Number} minMatchPercentage - Minimum match percentage required (default: 30 for better skill name matching)
 * @param {Object} fuzzyOptions - Fuzzy search configuration options
 * @returns {Array<Object>} - Array of matching students with match percentages
 */
const findMatchingStudents = (students, jobSkills, minMatchPercentage = 30, fuzzyOptions = {}) => {
    try {
        if (!Array.isArray(students) || !Array.isArray(jobSkills)) {
            return [];
        }
        
        const matchingStudents = [];
        
        for (const student of students) {
            if (!student.skills || !Array.isArray(student.skills)) {
                continue;
            }
            
            const matchPercentage = calculateMatchPercentage(student.skills, jobSkills, fuzzyOptions);
            
            if (matchPercentage >= minMatchPercentage) {
                matchingStudents.push({
                    student: student._id,
                    matchPercentage,
                    studentData: student
                });
            }
        }
        
        // Sort by match percentage (highest first)
        return matchingStudents.sort((a, b) => b.matchPercentage - a.matchPercentage);
        
    } catch (error) {
        console.error('Error finding matching students:', error);
        return [];
    }
};

/**
 * Filter students by minimum match percentage
 * @param {Array<Object>} matchedStudents - Array of students with match percentages
 * @param {Number} minPercentage - Minimum percentage to filter by
 * @returns {Array<Object>} - Filtered array of students
 */
const filterByMatchPercentage = (matchedStudents, minPercentage) => {
    try {
        if (!Array.isArray(matchedStudents) || typeof minPercentage !== 'number') {
            return [];
        }
        
        return matchedStudents.filter(match => match.matchPercentage >= minPercentage);
        
    } catch (error) {
        console.error('Error filtering by match percentage:', error);
        return [];
    }
};

/**
 * Perform fuzzy text search on a string
 * @param {String} searchTerm - The term to search for
 * @param {String} targetText - The text to search in
 * @param {Number} threshold - Similarity threshold (0-1)
 * @returns {Boolean} - Whether the search term matches the target text
 */
const fuzzyTextSearch = (searchTerm, targetText, threshold = 0.6) => {
    try {
        if (!searchTerm || !targetText) {
            return false;
        }
        
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();
        const normalizedTargetText = targetText.toLowerCase().trim();
        
        // Exact match
        if (normalizedTargetText.includes(normalizedSearchTerm)) {
            return true;
        }
        
        // Split search term into words for partial matching
        const searchWords = normalizedSearchTerm.split(/\s+/);
        
        // Check if all search words have fuzzy matches in target text
        return searchWords.every(word => {
            if (word.length < 2) return true; // Skip very short words
            
            // Check for partial word matches
            const targetWords = normalizedTargetText.split(/\s+/);
            
            return targetWords.some(targetWord => {
                if (targetWord.includes(word) || word.includes(targetWord)) {
                    return true;
                }
                
                // Calculate similarity for fuzzy matching
                const similarity = calculateSimilarity(word, targetWord);
                return similarity >= threshold;
            });
        });
        
    } catch (error) {
        console.error('Error in fuzzy text search:', error);
        return false;
    }
};

/**
 * Apply fuzzy filters to a collection based on search criteria
 * @param {Array<Object>} items - Array of items to filter
 * @param {Object} filters - Filter criteria with fuzzy search support
 * @param {Object} options - Configuration options
 * @returns {Array<Object>} - Filtered array of items
 */
const fuzzyFilter = (items, filters, options = {}) => {
    try {
        const {
            fuzzyThreshold = 0.6,
            enableFuzzySearch = true,
            caseSensitive = false
        } = options;
        
        if (!Array.isArray(items)) {
            return [];
        }
        
        if (!filters || Object.keys(filters).length === 0) {
            return items;
        }
        
        return items.filter(item => {
            return Object.entries(filters).every(([key, searchValue]) => {
                if (searchValue === undefined || searchValue === null || searchValue === '') {
                    return true; // Skip empty filters
                }
                
                const itemValue = item[key];
                
                if (itemValue === undefined || itemValue === null) {
                    return false;
                }
                
                // Handle array values (like skills)
                if (Array.isArray(itemValue)) {
                    const searchArray = Array.isArray(searchValue) ? searchValue : [searchValue];
                    
                    return searchArray.some(searchItem => {
                        return itemValue.some(itemElement => {
                            const itemStr = String(itemElement);
                            const searchStr = String(searchItem);
                            
                            if (!enableFuzzySearch) {
                                return caseSensitive ? 
                                    itemStr.includes(searchStr) : 
                                    itemStr.toLowerCase().includes(searchStr.toLowerCase());
                            }
                            
                            return fuzzyTextSearch(searchStr, itemStr, fuzzyThreshold);
                        });
                    });
                }
                
                // Handle string/number values
                const itemStr = String(itemValue);
                const searchStr = String(searchValue);
                
                if (!enableFuzzySearch) {
                    return caseSensitive ? 
                        itemStr.includes(searchStr) : 
                        itemStr.toLowerCase().includes(searchStr.toLowerCase());
                }
                
                return fuzzyTextSearch(searchStr, itemStr, fuzzyThreshold);
            });
        });
        
    } catch (error) {
        console.error('Error in fuzzy filter:', error);
        return items;
    }
};

// Export statement moved to end of file after all functions are defined

// Export all functions - placed at end after all function definitions
export { 
    getAllJobs, 
    getJobById, 
    createJobPost, 
    updateJobPost, 
    deleteJobPost, 
    searchJobs, 
    getMyJobs, 
    updateJobStatus,
    // Export matching utilities for use by other controllers
    calculateMatchPercentage,
    findMatchingStudents,
    filterByMatchPercentage,
    fuzzyTextSearch,
    fuzzyFilter
};