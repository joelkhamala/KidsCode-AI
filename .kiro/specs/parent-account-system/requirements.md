# Requirements Document

## Introduction

This document specifies the requirements for implementing a proper parent account system for the Kids Coder learning platform. Currently, the "Parent Dashboard" misleadingly shows the logged-in child's own progress rather than enabling parents to monitor their children's learning. This feature will introduce distinct parent accounts with the ability to link multiple children and view their progress, achievements, and activity in a read-only capacity.

## Glossary

- **Parent_Account**: A user account with account_type='parent' that can link to and monitor multiple Child_Accounts
- **Child_Account**: A user account with account_type='child' that completes lessons and earns XP
- **Account_Link**: A relationship record connecting a Parent_Account to a Child_Account
- **Invite_Code**: A unique code generated for a Child_Account that allows a Parent_Account to link to it
- **Auth_System**: The JWT-based authentication system handling login and registration
- **Progress_Data**: Information about lesson completion, scores, XP, streaks, and achievements for a Child_Account
- **Dashboard**: The parent interface displaying linked children and their Progress_Data
- **Child_Detail_View**: A detailed view of a single child's progress, achievements, and activity

## Requirements

### Requirement 1: Account Type Differentiation

**User Story:** As a system administrator, I want to distinguish between parent and child accounts, so that the system can enforce appropriate permissions and display relevant interfaces.

#### Acceptance Criteria

1. THE Database SHALL store an account_type field for each user with values 'parent' or 'child'
2. WHEN a user registers, THE Auth_System SHALL assign an account_type based on the registration flow chosen
3. THE Auth_System SHALL include account_type in the JWT token payload
4. WHEN a user logs in, THE Frontend SHALL route to the appropriate dashboard based on account_type
5. THE Database SHALL maintain backward compatibility by treating existing users without account_type as Child_Accounts

### Requirement 2: Parent Account Registration

**User Story:** As a parent, I want to create my own account separate from my child's account, so that I can monitor my children's learning progress.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a parent registration endpoint at /api/register/parent
2. WHEN a parent registers, THE Auth_System SHALL require username, email, and password fields
3. WHEN a parent registers, THE Auth_System SHALL set account_type to 'parent'
4. THE Auth_System SHALL validate that the email is unique across all accounts
5. WHEN parent registration succeeds, THE Auth_System SHALL return a JWT token with account_type='parent'
6. THE Frontend SHALL display a parent-specific registration form with appropriate messaging
7. THE Frontend SHALL NOT require age or parent_email fields for parent registration

### Requirement 3: Child Account Registration with Parent Linking

**User Story:** As a parent, I want to link my account to my child's account during their registration, so that I can immediately monitor their progress.

#### Acceptance Criteria

1. THE Auth_System SHALL provide a child registration endpoint at /api/register/child
2. WHEN a child under 13 registers, THE Registration_Form SHALL require a parent_email field
3. WHEN a child registers with a parent_email that matches an existing Parent_Account, THE Auth_System SHALL automatically create an Account_Link
4. WHEN a child registers with a parent_email that does not match any Parent_Account, THE Auth_System SHALL store the parent_email for future linking
5. THE Auth_System SHALL send a notification email to the parent_email when a child account is created (if email service is configured)
6. WHEN child registration succeeds, THE Auth_System SHALL set account_type to 'child'

### Requirement 4: Invite Code Generation and Linking

**User Story:** As a parent, I want to link my existing child's account to my parent account using an invite code, so that I can monitor children who registered before I created my account.

#### Acceptance Criteria

1. THE System SHALL generate a unique 8-character alphanumeric Invite_Code for each Child_Account
2. WHEN a Child_Account is created, THE System SHALL store the Invite_Code in the database
3. THE Child_Account SHALL be able to view their Invite_Code in their profile settings
4. THE Parent_Account SHALL be able to enter an Invite_Code to link a Child_Account
5. WHEN a valid Invite_Code is entered, THE System SHALL create an Account_Link between the Parent_Account and Child_Account
6. WHEN an invalid Invite_Code is entered, THE System SHALL return an error message "Invalid invite code"
7. THE System SHALL prevent duplicate Account_Links for the same parent-child pair

### Requirement 5: Parent-Child Account Linking Management

**User Story:** As a parent, I want to manage which children are linked to my account, so that I can add new children or remove children who no longer need monitoring.

#### Acceptance Criteria

1. THE System SHALL store Account_Links in a parent_child_links table with parent_id, child_id, linked_at, and invite_code fields
2. THE System SHALL allow a Parent_Account to link multiple Child_Accounts
3. THE System SHALL allow a Child_Account to be linked to multiple Parent_Accounts
4. WHEN a Parent_Account requests their linked children, THE System SHALL return all Child_Accounts with active Account_Links
5. THE Parent_Account SHALL be able to remove an Account_Link
6. WHEN an Account_Link is removed, THE System SHALL delete the link record but preserve both accounts
7. THE System SHALL log all Account_Link creation and deletion events with timestamps

### Requirement 6: Parent Dashboard Overview

**User Story:** As a parent, I want to see an overview of all my linked children's progress, so that I can quickly assess their learning activity.

#### Acceptance Criteria

1. WHEN a Parent_Account logs in, THE Frontend SHALL display the Parent_Dashboard
2. THE Parent_Dashboard SHALL display a list of all linked Child_Accounts
3. FOR EACH linked Child_Account, THE Parent_Dashboard SHALL display username, age, current level, total XP, current streak, and completed lesson count
4. THE Parent_Dashboard SHALL display the last_active date for each Child_Account
5. THE Parent_Dashboard SHALL provide a "View Details" action for each Child_Account
6. WHEN no children are linked, THE Parent_Dashboard SHALL display instructions for linking children via Invite_Code or email
7. THE Parent_Dashboard SHALL display a "Link Child" button that opens the linking interface

### Requirement 7: Child Detail View for Parents

**User Story:** As a parent, I want to view detailed progress information for a specific child, so that I can understand their strengths, weaknesses, and learning patterns.

#### Acceptance Criteria

1. WHEN a Parent_Account selects a Child_Account from the dashboard, THE System SHALL display the Child_Detail_View
2. THE Child_Detail_View SHALL display overall progress percentage across all modules
3. THE Child_Detail_View SHALL display module-by-module progress with completion percentage and average score
4. THE Child_Detail_View SHALL display a weekly activity chart showing lessons completed per day for the last 7 days
5. THE Child_Detail_View SHALL identify and display strengths (modules with average score >= 80%)
6. THE Child_Detail_View SHALL identify and display areas needing practice (modules with average score < 70%)
7. THE Child_Detail_View SHALL display all unlocked achievements with unlock dates
8. THE Child_Detail_View SHALL display the child's current XP, level, and streak

### Requirement 8: Read-Only Access for Parent Accounts

**User Story:** As a system administrator, I want to ensure parent accounts have read-only access to child progress data, so that parents cannot modify their children's learning records.

#### Acceptance Criteria

1. THE System SHALL prevent Parent_Accounts from accessing lesson completion endpoints
2. THE System SHALL prevent Parent_Accounts from accessing code execution endpoints
3. THE System SHALL prevent Parent_Accounts from modifying Progress_Data for any Child_Account
4. THE System SHALL prevent Parent_Accounts from modifying achievement records
5. WHEN a Parent_Account attempts to access a restricted endpoint, THE System SHALL return a 403 Forbidden error
6. THE System SHALL allow Parent_Accounts to access read-only progress, achievement, and curriculum endpoints for linked children
7. THE System SHALL validate that a Parent_Account can only access data for their linked Child_Accounts

### Requirement 9: Child Account Independence

**User Story:** As a child user, I want my learning experience to remain unchanged by the parent account system, so that I can continue completing lessons and earning XP as before.

#### Acceptance Criteria

1. THE System SHALL maintain all existing Child_Account functionality for lesson access, code execution, and progress tracking
2. WHEN a Child_Account is linked to a Parent_Account, THE Child_Account SHALL continue to access the child dashboard
3. THE Child_Account SHALL be able to view their Invite_Code in their profile
4. THE Child_Account SHALL be able to see which Parent_Accounts are linked to their account
5. THE System SHALL NOT modify the child's user interface based on parent linking status
6. THE Child_Account SHALL continue to earn XP, unlock achievements, and track streaks independently

### Requirement 10: Progress Report Export

**User Story:** As a parent, I want to download a detailed progress report for my child, so that I can share it with teachers or keep it for records.

#### Acceptance Criteria

1. THE Child_Detail_View SHALL display a "Download Report" button
2. WHEN a Parent_Account clicks "Download Report", THE System SHALL generate a PDF report
3. THE Report SHALL include the child's username, current level, total XP, and streak
4. THE Report SHALL include module-by-module progress with completion percentage and average score
5. THE Report SHALL include a list of all unlocked achievements with unlock dates
6. THE Report SHALL include the weekly activity chart for the last 7 days
7. THE Report SHALL include the report generation date and the parent's username
8. THE System SHALL generate the report within 5 seconds for typical progress data

### Requirement 11: Email Notifications for Parent Linking

**User Story:** As a parent, I want to receive email notifications when my child completes significant milestones, so that I can celebrate their achievements.

#### Acceptance Criteria

1. WHEN a Child_Account completes their first lesson, THE System SHALL send an email notification to all linked Parent_Accounts
2. WHEN a Child_Account completes an entire module, THE System SHALL send an email notification to all linked Parent_Accounts
3. WHEN a Child_Account unlocks an achievement, THE System SHALL send an email notification to all linked Parent_Accounts
4. WHEN a Child_Account reaches a new level milestone (every 5 levels), THE System SHALL send an email notification to all linked Parent_Accounts
5. THE Parent_Account SHALL be able to configure notification preferences (all, milestones only, or none)
6. THE Email SHALL include the child's username, the milestone achieved, and a link to the Parent_Dashboard
7. IF email service is not configured, THE System SHALL log notification events without sending emails

### Requirement 12: Security and Privacy

**User Story:** As a system administrator, I want to ensure that parent-child account linking is secure and respects privacy, so that unauthorized users cannot access child progress data.

#### Acceptance Criteria

1. THE System SHALL require authentication for all parent dashboard and child detail endpoints
2. THE System SHALL validate that a Parent_Account can only access Progress_Data for their linked Child_Accounts
3. WHEN a Parent_Account attempts to access data for an unlinked Child_Account, THE System SHALL return a 403 Forbidden error
4. THE System SHALL validate Invite_Codes are unique and cannot be reused after linking
5. THE System SHALL expire Invite_Codes after 90 days if not used
6. THE System SHALL allow Child_Accounts to regenerate their Invite_Code if needed
7. THE System SHALL log all access attempts to child progress data with parent_id, child_id, and timestamp
8. THE System SHALL NOT expose child email addresses or passwords to Parent_Accounts
