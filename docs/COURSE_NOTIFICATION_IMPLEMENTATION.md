# Course Creation Notification System

## Overview

This document explains how to implement notifications for students when a school creates a new course. The system automatically notifies all students who have previously enrolled in courses from the same training institute.

## Features

- **Automatic Detection**: Identifies students who have enrolled in courses from the school
- **Bulk Notifications**: Creates notifications for all relevant students efficiently
- **Real-time Updates**: Sends live notifications via Socket.io
- **Comprehensive Metadata**: Includes course details for enhanced user experience
- **Error Handling**: Graceful error handling that doesn't break course creation

## Implementation Details

### 1. Notification Flow

1. **Course Creation**: When a school creates a new course
2. **Student Discovery**: System finds all students who have enrolled in courses from this school
3. **Notification Creation**: Creates in-app notifications for each student
4. **Real-time Delivery**: Sends live notifications via WebSocket
5. **Storage**: Notifications are stored in the database for persistence

### 2. Key Components

#### Notification Service Functions

**`getSchoolStudents(schoolId)`**
- Finds all unique students who have enrolled in courses from a specific school
- Returns array of student user IDs
- Filters for active enrollments (enrolled/completed status)

**`createCourseCreationNotifications(course, schoolName, io)`**
- Creates bulk notifications for course creation
- Sends real-time notifications if Socket.io instance provided
- Returns array of created notification objects

#### Modified Components

**`courses.controllers.js`**
- Updated `createCourse` function to trigger notifications
- Integrates with Socket.io for real-time delivery
- Includes error handling that doesn't affect course creation

**`notification.models.js`**
- Added `course_created` to notification types enum

**`notification.constants.js`**
- Added `COURSE_CREATED` constant

## Usage Examples

### Basic Implementation

```javascript
// In course creation controller
import { createCourseCreationNotifications } from "../services/notification.service.js";

const createCourse = asyncHandler(async (req, res) => {
  // ... course creation logic ...
  
  const course = await Course.create(courseData);
  school.courses.push(course._id);
  await school.save();

  // Send notifications to students
  try {
    const io = req.app.get("io"); // Get socket.io instance
    await createCourseCreationNotifications(course, school.name, io);
  } catch (notificationError) {
    console.error("Failed to send notifications:", notificationError);
    // Course creation continues even if notifications fail
  }

  return res.json(createdResponse({ course }, "Course created successfully"));
});
```

### Manual Notification Sending

```javascript
// Send notifications manually for an existing course
import { createCourseCreationNotifications } from "./services/notification.service.js";

async function notifyStudentsAboutCourse(courseId, schoolName, io) {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const notifications = await createCourseCreationNotifications(
      course, 
      schoolName, 
      io
    );
    
    console.log(`Sent ${notifications.length} notifications`);
    return notifications;
  } catch (error) {
    console.error('Notification error:', error);
    throw error;
  }
}
```

### Client-Side Integration

```javascript
// Frontend - Listen for real-time notifications
import io from 'socket.io-client';

const socket = io('/notifications', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

socket.on('new_notification', (notification) => {
  console.log('New notification received:', notification);
  
  // Display notification in UI
  showNotificationToast({
    title: notification.title,
    message: notification.message,
    type: notification.type,
    actionUrl: notification.actionUrl
  });
  
  // Update notification count
  updateNotificationBadge();
});

socket.on('connect', () => {
  console.log('Connected to notification service');
});
```

## Notification Structure

### Database Schema

```javascript
{
  _id: ObjectId,
  recipient: ObjectId, // Student user ID
  title: "New Course Available!",
  message: "TechEd Institute has launched a new course: \"Advanced JavaScript\". Check it out and enroll if interested!",
  type: "course_created",
  relatedEntity: {
    entityType: "course",
    entityId: ObjectId // Course ID
  },
  actionUrl: "/courses/64a7b8c9d1e2f3a4b5c6d7e8",
  priority: "normal",
  status: "unread",
  metadata: {
    courseId: ObjectId,
    schoolId: ObjectId,
    courseTitle: "Advanced JavaScript",
    instructor: "John Doe",
    category: "Technology"
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Real-time Event

```javascript
// Socket.io event structure
{
  event: 'new_notification',
  data: {
    id: "64a7b8c9d1e2f3a4b5c6d7e8",
    title: "New Course Available!",
    message: "TechEd Institute has launched a new course...",
    type: "course_created",
    actionUrl: "/courses/64a7b8c9d1e2f3a4b5c6d7e8",
    priority: "normal",
    createdAt: "2024-01-15T10:30:00.000Z",
    metadata: {
      courseId: "64a7b8c9d1e2f3a4b5c6d7e8",
      courseTitle: "Advanced JavaScript",
      instructor: "John Doe"
    }
  }
}
```

## API Endpoints

The system leverages existing notification endpoints:

- `GET /api/notifications` - Fetch user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read
- `DELETE /api/notifications/:id` - Delete notification

## Testing

Run the test suite to verify functionality:

```bash
npm test course-notification.test.js
```

The test suite covers:
- Student discovery for schools
- Notification creation and content
- Real-time socket integration
- Edge cases (no students, no courses)

## Configuration

### Environment Variables

Ensure these are set in your `.env` file:

```env
ACCESS_TOKEN_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Socket.io Setup

The notification socket is automatically registered in `server.js`:

```javascript
import { initNotificationSocket } from './sockets/notification.socket.js';

// Register notification socket handlers
initNotificationSocket(io);
```

## Customization Options

### 1. Notification Criteria

Modify `getSchoolStudents()` to change which students receive notifications:

```javascript
// Option 1: Only currently enrolled students
const enrollments = await Enrollment.find({ 
  courseId: { $in: courseIds },
  status: 'enrolled' // Only currently enrolled
}).select('studentId');

// Option 2: Students in specific categories
const enrollments = await Enrollment.find({ 
  courseId: { $in: courseIds }
}).populate({
  path: 'courseId',
  match: { category: { $in: ['Technology', 'Business'] } }
}).select('studentId');
```

### 2. Notification Content

Customize notification messages:

```javascript
const notificationData = {
  title: `🎓 New ${course.category} Course!`,
  message: `${schoolName} just added "${course.title}" by ${course.instructor}. Duration: ${course.duration}. Price: $${course.price}`,
  // ... rest of the data
};
```

### 3. Notification Timing

Add delays or scheduling:

```javascript
// Delay notification by 5 minutes
setTimeout(async () => {
  await createCourseCreationNotifications(course, school.name, io);
}, 5 * 60 * 1000);

// Or use a job queue for better reliability
import Bull from 'bull';
const notificationQueue = new Bull('notification queue');

notificationQueue.add('course-created', {
  courseId: course._id,
  schoolName: school.name
}, { delay: 5 * 60 * 1000 });
```

## Troubleshooting

### Common Issues

1. **No notifications sent**
   - Check if students have enrolled in school courses
   - Verify course `trainingProvider` field is set correctly
   - Check console logs for errors

2. **Real-time notifications not working**
   - Ensure Socket.io is properly configured
   - Check client-side authentication
   - Verify notification namespace connection

3. **Performance issues**
   - Monitor notification batch sizes
   - Consider implementing rate limiting
   - Use Redis for caching frequent queries

### Debug Logging

Add debugging to track the notification flow:

```javascript
console.log(`School ${schoolId} has ${courseIds.length} courses`);
console.log(`Found ${studentIds.length} unique students`);
console.log(`Created ${notifications.length} notifications`);
```

## Best Practices

1. **Error Handling**: Always use try-catch blocks
2. **Performance**: Batch process large notification sets
3. **User Experience**: Include relevant course metadata
4. **Privacy**: Only notify students who have engaged with the school
5. **Testing**: Write comprehensive tests for notification logic
6. **Monitoring**: Log notification metrics for analysis

## Future Enhancements

1. **Notification Preferences**: Allow students to customize notification types
2. **Digest Mode**: Send daily/weekly course summaries
3. **Smart Recommendations**: Use ML to suggest relevant courses
4. **Email Integration**: Send email notifications for important updates
5. **Push Notifications**: Mobile app integration
6. **Analytics**: Track notification engagement rates
