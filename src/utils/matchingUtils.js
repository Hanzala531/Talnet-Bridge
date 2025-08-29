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
 * Check if skills match with fuzzy search capabilities
 * @param {String} studentSkill - Student's skill
 * @param {String} jobSkill - Job requirement skill
 * @param {Number} fuzzyThreshold - Minimum similarity score (0-1) for fuzzy match
 * @returns {Object} - Match result with score and type
 */
const checkSkillMatch = (studentSkill, jobSkill, fuzzyThreshold = 0.8) => {
    const normalizedStudentSkill = studentSkill.toLowerCase().trim();
    const normalizedJobSkill = jobSkill.toLowerCase().trim();
    
    // Exact match
    if (normalizedStudentSkill === normalizedJobSkill) {
        return { isMatch: true, score: 1.0, type: 'exact' };
    }
    
    // Partial match (contains)
    if (normalizedStudentSkill.includes(normalizedJobSkill) || normalizedJobSkill.includes(normalizedStudentSkill)) {
        return { isMatch: true, score: 0.9, type: 'partial' };
    }
    
    // Fuzzy match (similarity based)
    const similarity = calculateSimilarity(normalizedStudentSkill, normalizedJobSkill);
    if (similarity >= fuzzyThreshold) {
        return { isMatch: true, score: similarity, type: 'fuzzy' };
    }
    
    // Check for common abbreviations and variations
    const abbreviationMap = {
        'js': 'javascript',
        'ts': 'typescript',
        'py': 'python',
        'c#': 'csharp',
        'c++': 'cplusplus',
        'css3': 'css',
        'html5': 'html',
        'node': 'nodejs',
        'react': 'reactjs',
        'vue': 'vuejs',
        'angular': 'angularjs',
        'ml': 'machine learning',
        'ai': 'artificial intelligence',
        'db': 'database',
        'sql': 'structured query language'
    };
    
    // Check if either skill is an abbreviation of the other
    for (const [abbr, full] of Object.entries(abbreviationMap)) {
        if ((normalizedStudentSkill === abbr && normalizedJobSkill === full) ||
            (normalizedStudentSkill === full && normalizedJobSkill === abbr)) {
            return { isMatch: true, score: 0.95, type: 'abbreviation' };
        }
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
export const calculateMatchPercentage = (studentSkills, jobSkills, options = {}) => {
    try {
        const {
            fuzzyThreshold = 0.8,
            exactMatchWeight = 1.0,
            partialMatchWeight = 0.9,
            fuzzyMatchWeight = 0.7,
            abbreviationMatchWeight = 0.95
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
 * Find matching students for a specific job with fuzzy search
 * @param {Array<Object>} students - Array of student objects with skills
 * @param {Array<Object>} jobSkills - Array of job's required skills
 * @param {Number} minMatchPercentage - Minimum match percentage required (default: 20)
 * @param {Object} fuzzyOptions - Fuzzy search configuration options
 * @returns {Array<Object>} - Array of matching students with match percentages
 */
export const findMatchingStudents = (students, jobSkills, minMatchPercentage = 20, fuzzyOptions = {}) => {
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
export const filterByMatchPercentage = (matchedStudents, minPercentage) => {
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
 * Fuzzy search for filtering data based on text fields
 * Useful for searching employers, students, or jobs by name/title
 * @param {Array<Object>} data - Array of objects to search
 * @param {String} searchTerm - Search term
 * @param {Array<String>} searchFields - Fields to search in
 * @param {Number} fuzzyThreshold - Minimum similarity score (default: 0.6)
 * @returns {Array<Object>} - Filtered and scored results
 */
export const fuzzyTextSearch = (data, searchTerm, searchFields, fuzzyThreshold = 0.6) => {
    try {
        if (!Array.isArray(data) || !searchTerm || !Array.isArray(searchFields)) {
            return data;
        }
        
        const normalizedSearchTerm = searchTerm.toLowerCase().trim();
        if (normalizedSearchTerm === '') {
            return data;
        }
        
        const scoredResults = [];
        
        for (const item of data) {
            let bestScore = 0;
            let matchedField = '';
            
            for (const field of searchFields) {
                const fieldValue = item[field];
                if (!fieldValue) continue;
                
                const normalizedFieldValue = fieldValue.toString().toLowerCase().trim();
                
                // Exact match
                if (normalizedFieldValue === normalizedSearchTerm) {
                    bestScore = 1.0;
                    matchedField = field;
                    break;
                }
                
                // Contains match
                if (normalizedFieldValue.includes(normalizedSearchTerm)) {
                    const containsScore = 0.8;
                    if (containsScore > bestScore) {
                        bestScore = containsScore;
                        matchedField = field;
                    }
                }
                
                // Fuzzy similarity match
                const similarity = calculateSimilarity(normalizedFieldValue, normalizedSearchTerm);
                if (similarity > bestScore && similarity >= fuzzyThreshold) {
                    bestScore = similarity;
                    matchedField = field;
                }
            }
            
            if (bestScore >= fuzzyThreshold) {
                scoredResults.push({
                    ...item,
                    searchScore: bestScore,
                    matchedField
                });
            }
        }
        
        // Sort by search score (highest first)
        return scoredResults.sort((a, b) => b.searchScore - a.searchScore);
        
    } catch (error) {
        console.error('Error in fuzzy text search:', error);
        return data;
    }
};

/**
 * Enhanced filtering with fuzzy search for categories and fields
 * @param {Array<Object>} data - Array of objects to filter
 * @param {Object} filters - Filter criteria object
 * @param {Number} fuzzyThreshold - Minimum similarity for fuzzy matches (default: 0.7)
 * @returns {Array<Object>} - Filtered results
 */
export const fuzzyFilter = (data, filters, fuzzyThreshold = 0.7) => {
    try {
        if (!Array.isArray(data) || !filters || typeof filters !== 'object') {
            return data;
        }
        
        return data.filter(item => {
            for (const [filterKey, filterValue] of Object.entries(filters)) {
                if (filterValue === undefined || filterValue === null || filterValue === '') {
                    continue; // Skip empty filters
                }
                
                const itemValue = item[filterKey];
                if (itemValue === undefined || itemValue === null) {
                    return false; // Item doesn't have this field
                }
                
                const normalizedFilterValue = filterValue.toString().toLowerCase().trim();
                const normalizedItemValue = itemValue.toString().toLowerCase().trim();
                
                // Exact match
                if (normalizedItemValue === normalizedFilterValue) {
                    continue; // This filter passes
                }
                
                // Fuzzy match for string fields
                if (typeof filterValue === 'string') {
                    const similarity = calculateSimilarity(normalizedItemValue, normalizedFilterValue);
                    if (similarity >= fuzzyThreshold) {
                        continue; // This filter passes with fuzzy match
                    }
                }
                
                // If we reach here, this filter failed
                return false;
            }
            
            return true; // All filters passed
        });
        
    } catch (error) {
        console.error('Error in fuzzy filter:', error);
        return data;
    }
};
