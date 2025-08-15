import { Notification } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";

// Get user notifications
const getUserNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, unread } = req.query;

        const filter = { userId };
        if (unread === 'true') {
            filter.isRead = false;
        }

        const skip = (page - 1) * limit;
        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));

        const total = await Notification.countDocuments(filter);

        res.status(200).json(
            new successResponse(200, {
                notifications,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }, "Notifications retrieved successfully")
        );
    } catch (error) {
        console.error("Get notifications error:", error);
        throw new ApiError(500, "Failed to retrieve notifications");
    }
});

// Get notification count
const getNotificationCount = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const totalCount = await Notification.countDocuments({ userId });
        const unreadCount = await Notification.countDocuments({ 
            userId, 
            isRead: false 
        });

        res.status(200).json(
            new successResponse(200, {
                total: totalCount,
                unread: unreadCount
            }, "Notification count retrieved successfully")
        );
    } catch (error) {
        console.error("Get notification count error:", error);
        throw new ApiError(500, "Failed to get notification count");
    }
});

// Mark notification as read
const markNotificationAsRead = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true, readAt: new Date() },
            { new: true }
        );

        if (!notification) {
            throw new ApiError(404, "Notification not found");
        }

        res.status(200).json(
            new successResponse(200, notification, "Notification marked as read")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Mark notification as read error:", error);
        throw new ApiError(500, "Failed to mark notification as read");
    }
});

// Mark all notifications as read
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true, readAt: new Date() }
        );

        res.status(200).json(
            new successResponse(200, {
                modifiedCount: result.modifiedCount
            }, "All notifications marked as read")
        );
    } catch (error) {
        console.error("Mark all notifications as read error:", error);
        throw new ApiError(500, "Failed to mark all notifications as read");
    }
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            userId
        });

        if (!notification) {
            throw new ApiError(404, "Notification not found");
        }

        res.status(200).json(
            new successResponse(200, null, "Notification deleted successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Delete notification error:", error);
        throw new ApiError(500, "Failed to delete notification");
    }
});

export {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getNotificationCount
};
