/**
 * Test fixtures and mock data for consistent testing
 */

export const mockUsers = {
  student: {
    fullName: 'Test Student',
    email: 'student@testfixture.com',
    phone: '03001111111',
    password: 'TestPassword123!',
    role: 'student',
    status: 'approved',
    onboardingStage: 'active',
  },
  school: {
    fullName: 'Test Training Provider',
    email: 'school@testfixture.com',
    phone: '03002222222',
    password: 'TestPassword123!',
    role: 'school',
    status: 'approved',
    onboardingStage: 'active',
  },
  employer: {
    fullName: 'Test Employer',
    email: 'employer@testfixture.com',
    phone: '03003333333',
    password: 'TestPassword123!',
    role: 'employer',
    status: 'approved',
    onboardingStage: 'active',
  },
  admin: {
    fullName: 'Test Admin',
    email: 'admin@testfixture.com',
    phone: '03004444444',
    password: 'TestPassword123!',
    role: 'admin',
    status: 'approved',
    onboardingStage: 'active',
  },
};

export const mockCourse = {
  title: 'Test Course Fixture',
  instructor: 'Test Instructor',
  duration: '6 weeks',
  price: 299.99,
  language: 'English',
  type: 'online',
  description: 'A comprehensive test course for fixtures',
  objectives: [
    'Learn testing fundamentals',
    'Master course creation',
    'Build confidence in API design',
  ],
  skills: [
    'Testing',
    'JavaScript',
    'API Development',
    'Quality Assurance',
  ],
  category: 'Technology',
  status: 'approved',
  maxEnrollments: 50,
  currentEnrollments: 0,
};

export const mockJob = {
  jobTitle: 'Test Software Engineer',
  department: 'Engineering',
  location: 'Test City',
  employmentType: 'Full-time',
  salary: {
    min: 50000,
    max: 80000,
    currency: 'PKR',
  },
  jobDescription: 'We are looking for a skilled software engineer to join our test team.',
  skillsRequired: [
    {
      skill: 'JavaScript',
      proficiency: 'Intermediate',
    },
    {
      skill: 'React',
      proficiency: 'Advanced',
    },
    {
      skill: 'Node.js',
      proficiency: 'Intermediate',
    },
  ],
  benefits: 'Health insurance, flexible working hours, learning budget',
  category: 'Technology',
  status: 'active',
};

export const mockStudent = {
  bio: 'Passionate about technology and continuous learning',
  location: 'Test City, Test Country',
  website: 'https://test-portfolio.com',
  skills: [
    'JavaScript',
    'React',
    'Node.js',
    'MongoDB',
    'Express.js',
  ],
  gsceResult: [
    {
      subject: 'Mathematics',
      grade: 'A*',
    },
    {
      subject: 'Physics',
      grade: 'A',
    },
    {
      subject: 'Chemistry',
      grade: 'A',
    },
    {
      subject: 'English',
      grade: 'B',
    },
  ],
};

export const mockEmployer = {
  name: 'Test Corporation',
  companySize: '100-500',
  industry: 'Technology',
  websiteLink: 'https://test-corp.com',
  description: 'A leading technology company focused on innovation',
  location: {
    address: '123 Test Street',
    city: 'Test City',
    state: 'Test State',
    country: 'Test Country',
    postalCode: '12345',
  },
  contact: {
    phone: '+1-555-0123',
    email: 'contact@test-corp.com',
  },
};

export const mockKYC = {
  documents: [
    {
      docType: 'CNIC',
      docUrl: 'https://test-storage.com/cnic.jpg',
    },
    {
      docType: 'transcript',
      docUrl: 'https://test-storage.com/transcript.pdf',
    },
  ],
  status: 'pending',
};

export const mockCertification = {
  name: 'Test JavaScript Certification',
  issuedBy: 'Test Certification Authority',
  issueDate: new Date('2023-06-15'),
  certificateFile: 'https://test-storage.com/certificate.pdf',
  extracted: false,
};

export const mockExperience = {
  title: 'Junior Software Developer',
  company: 'Test Tech Solutions',
  startDate: new Date('2022-01-15'),
  endDate: new Date('2023-06-30'),
  description: 'Developed web applications using modern JavaScript frameworks and contributed to multiple successful projects.',
};

export const mockSubscriptionPlan = {
  name: 'premium',
  displayName: 'Premium Plan',
  description: 'Advanced features for growing training providers',
  price: 2999,
  billingCycle: 'monthly',
  features: {
    maxCourses: 50,
    maxStudents: 1000,
    analyticsAccess: true,
    prioritySupport: true,
    customBranding: false,
  },
  stripePriceId: 'price_test_premium',
  stripeProductId: 'prod_test_premium',
  isActive: true,
};

export const mockNotification = {
  title: 'Test Notification',
  message: 'This is a test notification for fixture purposes',
  type: 'course_enrollment',
  priority: 'normal',
  isRead: false,
  relatedEntity: {
    entityType: 'course',
    entityId: null, // Will be set dynamically
  },
};

export const validationTestCases = {
  invalidEmails: [
    'invalid-email',
    'test@',
    '@test.com',
    'test..test@example.com',
    'test@.com',
  ],
  invalidPhones: [
    '123',
    'abc123',
    '00123456789012345',
    '+92-invalid',
  ],
  invalidPasswords: [
    '123',
    'short',
    '',
    'no-uppercase',
  ],
  invalidPrices: [
    -100,
    'invalid',
    null,
    undefined,
  ],
  invalidObjectIds: [
    'invalid-id',
    '123',
    'not-an-objectid',
    '',
  ],
};

export const performanceTestData = {
  bulkUsers: (count = 10) =>
    Array.from({ length: count }, (_, index) => ({
      ...mockUsers.student,
      fullName: `Bulk User ${index + 1}`,
      email: `bulk${index + 1}@test.com`,
      phone: `03001234${String(567 + index).padStart(3, '0')}`,
    })),
  
  bulkCourses: (providerId, count = 10) =>
    Array.from({ length: count }, (_, index) => ({
      ...mockCourse,
      title: `Bulk Course ${index + 1}`,
      instructor: `Instructor ${index + 1}`,
      price: 100 + index * 50,
      trainingProvider: providerId,
    })),
  
  bulkJobs: (employerId, count = 10) =>
    Array.from({ length: count }, (_, index) => ({
      ...mockJob,
      jobTitle: `Bulk Job ${index + 1}`,
      department: `Department ${index + 1}`,
      salary: {
        min: 40000 + index * 5000,
        max: 60000 + index * 10000,
        currency: 'PKR',
      },
      postedBy: employerId,
    })),
};

export const apiResponseTemplates = {
  success: (data, message = 'Operation successful', statusCode = 200) => ({
    success: true,
    statusCode,
    data,
    message,
  }),
  
  error: (message = 'Operation failed', statusCode = 400, errors = null) => ({
    success: false,
    statusCode,
    message,
    errors,
  }),
  
  pagination: (items, page = 1, limit = 10, total = null) => ({
    [items]: [],
    pagination: {
      page,
      limit,
      total: total || 0,
      totalPages: Math.ceil((total || 0) / limit),
    },
  }),
};

export const testScenarios = {
  userRegistrationFlow: {
    validData: mockUsers.student,
    duplicateEmail: {
      ...mockUsers.student,
      email: 'duplicate@test.com',
    },
    invalidEmail: {
      ...mockUsers.student,
      email: 'invalid-email',
    },
    shortPassword: {
      ...mockUsers.student,
      password: '123',
    },
  },
  
  courseCreationFlow: {
    validData: mockCourse,
    missingRequired: {
      title: 'Incomplete Course',
    },
    invalidPrice: {
      ...mockCourse,
      price: -100,
    },
    emptyObjectives: {
      ...mockCourse,
      objectives: [],
    },
  },
  
  jobPostingFlow: {
    validData: mockJob,
    missingRequired: {
      jobTitle: 'Incomplete Job',
    },
    invalidEmploymentType: {
      ...mockJob,
      employmentType: 'Invalid Type',
    },
  },
};

export default {
  mockUsers,
  mockCourse,
  mockJob,
  mockStudent,
  mockEmployer,
  mockKYC,
  mockCertification,
  mockExperience,
  mockSubscriptionPlan,
  mockNotification,
  validationTestCases,
  performanceTestData,
  apiResponseTemplates,
  testScenarios,
};
