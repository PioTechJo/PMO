# BioTech Project Portfolio - User Manual (Version 1.2)

Welcome to the **BioTech Project Portfolio Management System**. This guide provides a comprehensive overview of the system's features and functionalities, specifically designed to streamline project tracking and approval workflows.

---

## 1. Getting Started

### 1.1 Login
The system integrated with **Google Authentication**. Simply sign in with your authorized email to access your dashboard. Your role (Manager, PM, PS, etc.) will determine which modules and data you can access.

### 1.2 Interface Layout
- **Sidebar**: Navigate between modules (Dashboard, Projects, Milestones, Issues, etc.).
- **Global Search (Ctrl+K)**: Instantly find any Project, Milestone, or User across the entire system.
- **Notification Bell**: Located in the top right. Alerts you to pending approvals, new assignments, and system updates.
- **Profile Menu**: Switch your interface language between **Arabic and English** or change your UI theme (Light/Dark mode).

---

## 2. Core Modules

### 2.1 Dashboard & Intelligence
The Dashboard provides Department-level visibility into your project portfolio using interactive visualizations (Bubble Charts and KPIs).
- **Bubble Chart**: Visualizes projects based on *Revenue Impact* vs. *Strategic Value*. The size and color of the bubble represent *Progress* and *Risk*.
- **Department KPIs**: Dynamic metrics showing total project counts, maintenance revenue, and overall resource loading.

### 2.2 Projects Module (Detailed)
The Projects module is the heart of the system, allowing you to manage the entire lifecycle of a project.

#### **Viewing Projects**
- **Search & Filter**: Find projects by their internal codes, status, or assigned manager.
- **Grid/List View**: Toggle between different views to see high-level stats or detailed project rows.

#### **Creating/Editing a Project**
When creating or updating a project, you manage several critical data points:
- **Identity**: Project Name, Description, and an automatically generated **Project Code**.
- **Categorization**: 
    - **Country & Team**: Assign the geographical origin and the internal department handling the work.
    - **Product & Category**: Classify the project by the biotech solution it provides.
- **Stakeholders**:
    - **Project Manager (PM)**: The primary owner of the project.
    - **Customer**: Link the project to a specific client record for maintenance tracking.
- **Dates**:
    - **Launch Date**: Planned initial release.
    - **Actual Start Date**: When the work officially commenced.
    - **Expected Closure**: The target date for final delivery.
- **Progress**: A slider (0-100%) to track overall completion.

#### **KPI & Risk Management (The Sliders)**
One of the most powerful features is the risk and value assessment tool. When editing a project, adjust these 5 sliders:
1. **Revenue Impact**: The financial weight of the project.
2. **Strategic Value**: How much it aligns with long-term BioTech goals.
3. **Delivery Risk**: Complexity and technical difficulty levels.
4. **Customer Pressure**: Priority and urgency from the client's side.
5. **Resource Load**: The amount of workforce bandwidth consumed by this project.

*Adjusting these values updates the Dashboard bubble chart in real-time.*

### 2.3 Milestones (Maker/Checker Workflow)
Our system uses a **Two-Factor Approval (Maker/Checker)** process for Milestone Due Dates to ensure data integrity.

- **The Maker (PM)**: 
    1. Selects a Milestone and clicks **"Request Change"**.
    2. Proposes a new **Due Date** and enters a written **Justification**.
    3. The milestone enters a "Pending" state (the old date remains visible but blurred).
- **The Checker (Manager)**:
    1. Receives an automated **Notification**.
    2. Opens the **Approvals** pane in the Milestones module.
    3. Reviews the PM's justification and either **Approves** (applying the new date) or **Rejects** (reverting to the old date).

### 2.4 Issues & Task Tracking
Track technical issues, bugs, and requirements for each milestone.
- **Priority**: Mark tasks as Critical, High, Medium, or Low.
- **Collaboration**: Dedicated comment threads for every issue to keep communication centralized.
- **Activity Log**: See exactly when a task was opened, moved to "In Progress," or "Resolved."

### 2.5 Maintenance Contracts
Manage ongoing service agreements that generate recurring revenue.
- **Financial Status**: Track Total Agreement value vs. Lost amounts vs. Collected revenue.
- **Renewal Tracking**: Monitor start and end dates to ensure no service gaps occur with clients.

### 2.6 Milestone Changes History
The system maintains a full audit log of all changes made to milestone due dates.
- **Access**: Click the **"Changes History"** (سجل التغييرات) button in the Milestones module top header.
- **Filtering**: View history for the entire system or filter by a specific **Project** using the searchable dropdown.
- **Audit Trail**: Every entry shows:
    - **Original Due Date**: What the date was before the change.
    - **New Due Date**: The proposed/approved date.
    - **Reason**: The justification provided by the Project Manager.
    - **Status**: Whether the change was Approved, Rejected, or is still Pending.
    - **Participants**: Who requested the change and who acted on it.

---

## 3. Roles and Permissions Matrix

| Component | Role: Manager | Role: Project Manager (PM) | Role: Project Support (PS) |
| :--- | :---: | :---: | :---: |
| Dashboard Views | Full Access | Full Access | No Access |
| Create Projects | Yes | Yes (Configurable) | No |
| Approve Deadlines | **Primary Checker** | No | No |
| Request Deadlines | Yes | **Primary Maker** | No |
| Issue Management | Full Access | Full Access | Create/Comment Only |

---

## 4. FAQs & Tips
- **How do I find a missing project?** Use the Global Search (Ctrl+K) and type the project code. Ensure your filters aren't hidden by "Completed" status.
- **Why can't I edit a Due Date directly?** Critical dates require approval. Click "Request Modification" to start the workflow.
- **How do I switch to Arabic?** Go to the Profile icon in the top right -> Settings -> Language -> Arabic.

---
*BioTech Portfolio User Manual - Confidential. 2026 Update.*
