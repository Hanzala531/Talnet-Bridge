import { ApiError } from "../../utils/ApiError.js";

// Define role matrix for DM conversations
export const ALLOWED_DM = {
  admin: ["student", "school", "employer"],
  school: ["admin", "student", "employer"],
  student: ["admin", "school"],
  employer: ["admin", "school"],
};

/**
 * Check if a user with fromRole can start a conversation with toRole
 * @param {string} fromRole - Role of the initiator
 * @param {string} toRole - Role of the target user
 * @returns {boolean} - Whether conversation is allowed
 */
export function canStartConversation(fromRole, toRole) {
  if (!fromRole || !toRole) {
    return false;
  }
  
  const normalizedFromRole = fromRole.toLowerCase();
  const normalizedToRole = toRole.toLowerCase();
  
  return (ALLOWED_DM[normalizedFromRole] || []).includes(normalizedToRole);
}

/**
 * Assert that a conversation can be started, throws ApiError if not allowed
 * @param {string} fromRole - Role of the initiator
 * @param {string} toRole - Role of the target user
 * @throws {ApiError} 403 if conversation not allowed
 */
export function assertCanStartConversation(fromRole, toRole) {
  if (!canStartConversation(fromRole, toRole)) {
    throw new ApiError(
      403,
      `Direct messages between ${fromRole} and ${toRole} are not allowed by role rules`
    );
  }
}

/**
 * Get all roles that a given role can message
 * @param {string} role - The role to check
 * @returns {string[]} - Array of allowed target roles
 */
export function getAllowedTargetRoles(role) {
  if (!role) {
    return [];
  }
  
  const normalizedRole = role.toLowerCase();
  return ALLOWED_DM[normalizedRole] || [];
}
