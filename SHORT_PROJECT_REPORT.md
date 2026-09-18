# 1. Cover Page

- Project Title: [Project Title]
- Team Members: [Team Member Name]
- Date: [Date]
- Lab / Instructor: [Instructor Name]

# 2. Table of Contents

1. Abstract - [Page No.]
2. Introduction - [Page No.]
3. Literature Review / Related Work - [Page No.]
4. Methodology - [Page No.]
5. System Design and Architecture - [Page No.]
6. Implementation - [Page No.]
7. Results and Discussion - [Page No.]
8. Conclusion and Future Work - [Page No.]
9. Feature Status Table - [Page No.]
10. Technology Stack Table - [Page No.]

# 3. Abstract

This project is an Android mobile application for book reading and user-based reading management. The app allows users to register, log in, browse books, read books, save favorites, and keep track of their reading progress. It also includes reading streak tracking and a daily token balance system for controlled access.

The project is developed using Kotlin, Jetpack Compose, Firebase Authentication, Firebase Firestore, Room Database, and DataStore. At the current stage, the main features are working properly. However, token transaction/history and some advanced features are still future work.

# 4. Introduction

## Project Background

Reading books on mobile devices has become very common because smartphones are easy to carry and use anywhere. Many users want one app where they can read books, keep their reading progress, and manage their personal reading data.

## Problem Statement

Many reading apps provide only basic reading support. They may not combine user login, favorite books, progress save, reading streak, and token-based access in one complete system. This creates a need for a simple and organized mobile reading app.

## Objectives

- To build an Android mobile reading app
- To add user login and registration
- To support book reading and favorite books
- To save user-related data
- To track reading progress and streak
- To manage daily token-based access

## Scope of the Project

This project mainly focuses on Android app development for book reading. It covers login/register, book browsing, reading, local storage, favorites, progress tracking, streak tracking, and Firebase-based user data sync. Features like token transaction/history, admin control, and notifications are outside the current completed scope.

# 5. Literature Review / Related Work

There are many ebook reader apps and digital library systems available today. These systems show that mobile reading apps are useful because users can read books anytime and anywhere. A good reading app should also remember user choices and reading progress.

Firebase is useful in this kind of project because it provides authentication and cloud database support. Authentication helps keep user accounts secure. Firestore helps store cloud-based user information such as token balance, favorite books, and recent progress. Local databases like Room are useful because they help store data on the device for faster access. DataStore is also helpful for small settings and streak-related data.

# 6. Methodology

## Development Approach

The project follows a step-by-step development process. First, the main reading and library features were built. After that, user authentication, favorites, progress tracking, cloud sync, reading streak, and token balance features were added.

## Tools and Technologies Used

- Android Studio for development
- Kotlin for app logic
- Jetpack Compose for UI design
- Firebase Authentication for login/register
- Firebase Firestore for cloud user data
- Room Database for local library and progress
- DataStore for settings and streak data
- OkHttp for API communication
- Dagger Hilt for dependency injection

## Project Timeline and Milestones

- Milestone 1: Basic app structure and UI
- Milestone 2: Book browsing and reading
- Milestone 3: Local storage for library and progress
- Milestone 4: Login and register system
- Milestone 5: Favorites and user data sync
- Milestone 6: Reading streak and daily token balance
- Future Milestone: Token history, admin tools, and more improvements

# 7. System Design and Architecture

The app uses a simple modern Android architecture. The user interface is made with Jetpack Compose. ViewModels handle screen logic and state. Firebase Authentication manages login and registration. Firebase Firestore stores important user data in the cloud. Room Database stores local library items and reading progress. DataStore stores user settings and streak information.

The reading flow is simple. First, the user logs in. Then the user can browse or import books, open a book, read it, and save progress. Favorite books can also be stored. The app keeps a daily token balance and updates it when token-based access is used.

## Simple Architecture Diagram

```text
User
  |
  v
Jetpack Compose UI
  |
  v
ViewModels
  |---- Firebase Authentication
  |---- Firebase Firestore
  |---- Room Database
  |---- DataStore
  |---- Book API / EPUB Reader
```

# 8. Implementation

## Completed Features

The following features are implemented in the current code:

- Login and register using Firebase Authentication
- Logout and logged-in user email display
- Book browsing and searching
- Book detail view
- EPUB reading inside the app
- Importing EPUB books from device storage
- Saving books in local library
- Favorite books support
- Reading progress save
- Reading streak tracking
- Daily token balance reset and token usage logic

## Partially Completed Features

- Cloud sync is available for selected user data such as favorites, token balance, streak values, and recent reading progress
- Token-based access logic is present, but full token management is not finished

## Planned Feature / Future Work

- Token transaction/history
- Better user dashboard
- Better Firebase security rules
- Admin panel
- Offline reading improvement
- Notifications
- More testing and final deployment

## Important Files and Folders

- `app/src/main/java/com/starry/myne/ui/` - UI screens and ViewModels
- `helpers/AuthManager.kt` - login/register logic
- `helpers/UserFirestoreRepository.kt` - cloud user sync
- `helpers/DailyTokenManager.kt` - daily token logic
- `helpers/ReadingStreakStore.kt` - streak tracking
- `database/` - local Room database
- `api/BookAPI.kt` - book API calls

# 9. Results and Discussion

The project currently works as a mobile reading app with account support and reading management features. Users can log in, read books, save favorite books, store reading progress, and continue their reading later. The app also tracks reading streak and daily token balance.

The current result matches most of the project objectives. The combination of local storage and Firebase sync is a strong point of the system. However, some advanced parts are still incomplete. The biggest unfinished part is token transaction/history. Some future features like admin control, notifications, and better offline support are also not complete yet.

# 10. Conclusion and Future Work

This project successfully builds an Android reading app with useful user features. The app already includes login/register, reading, favorites, user data sync, reading progress, streak tracking, and daily token balance. This makes the current system meaningful and usable.

There are still some limitations. Token transaction/history is not implemented yet. Firebase security can be improved more. The system also does not yet include an admin panel, complete offline reading improvements, or notification support. Future development should focus on these parts along with more testing and final deployment.

# Feature Status Table

| Feature | Status | Notes |
|---|---|---|
| Login/Register | Completed | Firebase Authentication is used |
| User Data Sync | Partially Completed | Firestore stores selected user data |
| Book Browsing/Search | Completed | API-based book loading is present |
| Book Reading | Completed | Internal EPUB reader is available |
| Favorite Books | Completed | Stored locally and synced |
| Reading Progress | Completed | Saved in Room database |
| Reading Streak | Completed | Tracked with DataStore |
| Daily Token Balance | Completed | Reset and consume logic found |
| Token Transaction/History | Planned Feature | Not completed yet |
| Admin Panel | Future Work | Not found in current code |
| Notifications | Future Work | Not found in current code |

# Technology Stack Table

| Component | Technology Used | Purpose |
|---|---|---|
| Mobile App | Android + Kotlin | Main app development |
| UI | Jetpack Compose | User interface |
| Authentication | Firebase Authentication | Login and register |
| Cloud Database | Firebase Firestore | User data sync |
| Local Database | Room | Library and progress storage |
| Local Preferences | DataStore | Settings and streak data |
| Network | OkHttp | API communication |
| Dependency Injection | Dagger Hilt | Manage dependencies |
