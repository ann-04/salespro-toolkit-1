# Testing Walkthrough: File Archiving & Audience Levels

This guide outlines how to verify the new File Archiving and Role-Based Access Control (Audience Levels) features in the Sales Assets Repository.

## Prerequisites
1. Ensure your backend server is running (`npm start` in `server/`).
2. Ensure your frontend application is running.
3. Log in to the application.

---

## Part 1: File Archiving

### 1. Archive a File
1. Navigate to the **Sales Assets** repository.
2. Open a folder containing files.
3. Find a file you wish to archive.
4. Click the **Edit** (pencil) icon on the file card.
5. In the dialog, check the **"Archive this file"** box.
6. Click **Save Changes**.
7. **Verify**: The file should disappear from the main list immediately (unless "Show Archived" is already checked).

### 2. View Archived Files
1. Look at the filter bar at the top of the file list.
2. Check the **"Show Archived"** box.
3. **Verify**: The file you just archived should reappear.
4. **Verify**: The file card should have a visible `ARCHIVED` badge (dark gray).

### 3. Un-archive a File
1. With "Show Archived" checked, find your archived file.
2. Click the **Edit** (pencil) icon.
3. Uncheck the **"Archive this file"** box.
4. Click **Save Changes**.
5. Uncheck the "Show Archived" filter.
6. **Verify**: The file is visible in the normal list.

---

## Part 2: Audience Levels (RBAC)

### 1. Set Audience Level during Upload
1. Click **Upload File** -> **Single File**.
2. Select a file.
3. Locate the **Audience Level** dropdown.
4. Select **"Partners & Internal"**.
5. Click **Upload**.
6. **Verify**: Once uploaded, the file card should display a **purple "Partner" badge** (or indigo/blue depending on your theme) next to the file details.

### 2. Set Audience Level for Bulk Upload
1. Click **Upload File** -> **Upload Folder**.
2. Select a folder with multiple files.
3. In the dialog, set **Audience Level (for all files)** to **"End Users (Public)"**.
4. Click **Upload**.
5. **Verify**: All resulting files should display a **purple "EndUser" badge**.

### 3. Edit Audience Level
1. Find an existing "Internal" file (Green badge).
2. Click **Edit**.
3. Change **Audience Level** to **"Partner"**.
4. Click **Save Changes**.
5. **Verify**: The badge on the file card changes from Green (Internal) to the Partner color.

---

## Part 3: Verification Logic (How it works)

- **Internal Users** (You): Can see `Internal`, `Partner`, and `EndUser` files.
- **Partner Users**:
    - Can **ONLY** see files marked `Partner` or `EndUser`.
    - Files marked `Internal` are strictly hidden from the API response for Partner accounts.
    - *To test this physically, you would need to log in with a user account that has `userType = 'PARTNER'` in the database.*
