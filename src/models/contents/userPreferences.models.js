import mongoose from "mongoose";

const userPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    // Profile Visibility
    publicProfile: { 
        type: Boolean,
         default: true 
        },
    openToWork: { 
        type: Boolean,
         default: false
        },
    showContactInfo: { 
        type: Boolean, 
        default: false
     },
    showCourseProgress: {
         type: Boolean,
          default: true
         },

    // Communication Preferences
    courseRecommendations: {
         type: Boolean,
          default: false 
        },
    marketingCommunications: { 
        type: Boolean, 
        default: false 
    },

    // Notification Preferences
    emailNotifications: { 
        type: Boolean, 
        default: true
     },
    applicationAlerts: {
         type: Boolean,
          default: true
         },
    interviewReminders: { 
        type: Boolean, 
        default: true
     },
    weeklyReports: {
         type: Boolean,
          default: false
         },
  },
  { timestamps: true }
);

export const UserPreferences = mongoose.model(
  "UserPreferences",
  userPreferencesSchema
);
