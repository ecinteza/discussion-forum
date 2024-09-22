# Discussion Forum
A simple and interactive web-based discussion forum where users can create threads, post comments, and manage their profiles. This project allows users to engage in discussions, with features such as registration, login, profile management, and thread creation.

## Features
- User Authentication: Users can register, log in, and log out securely using JWT tokens.
- Thread Creation: Authenticated users can create discussion threads on various topics.
- Commenting: Users can comment on existing threads.
- Search Functionality: Search threads by title or author.
- Profile Management: Users can view and update their profile details, including uploading a profile picture.
- Session Handling: JWT-based session handling to keep users logged in.
- Recent Threads: View a list of the most recent discussion threads.

## Technologies Used

### Frontend
- HTML5, CSS3, and JavaScript: For the UI and interactive components of the application.

### Pages:
- login.html: The login page for user authentication.
- register.html: The registration page for new users.
- home.html: The home page showing recent threads and the login/register forms.
- threads.html: A list of all discussion threads.
- post.html: A detailed view of a single post with its comments.
- profile.html: User profile page where profile details can be updated.

### Backend
- Node.js and Express.js: For handling the server-side operations.
- PostgreSQL: Database for managing users, posts, and comments.
- Multer: Middleware for handling profile picture uploads.
- JWT (JSON Web Tokens): For secure user authentication and session management.

## File Structure
- server.js: Contains the server-side code for handling API requests, user authentication, post management, and more.
- Database: PostgreSQL is used to store user information, posts, comments, and profile pictures.

## Installation

### Prerequisites
- Node.js
- PostgreSQL

### Setup
Clone the repository:
- git clone https://github.com/YourUsername/discussion-forum.git
- cd discussion-forum

Install dependencies:
- npm install

Configure PostgreSQL:

Make sure PostgreSQL is installed and running.
Set up a database named Discussion Forum with a user named postgres and a password.
Update the server.js file with your database credentials if needed.
Run the SQL File

## API Endpoints

### User Authentication

- POST /register: Register a new user.
- POST /login: Log in a user and return a JWT.
- POST /validateToken: Validate a user's token.

### Post and Thread Management
- POST /createPost: Create a new post (protected route, requires JWT).
- GET /recentThreads: Fetch the 3 most recent discussion threads.
- GET /posts: Fetch all discussion posts.
- GET /posts/:postId: Fetch a single post by its ID.
- POST /posts/:postId/comments: Add a comment to a post (protected route).
- GET /posts/:postId/comments: Fetch all comments for a specific post.

### Profile Management
- POST /profileData: Fetch user profile data (protected route).
- POST /uploadProfilePicture: Upload a new profile picture (protected route).
- PUT /updateProfile: Update a user's profile (protected route).
- POST /changePassword: Change a user's password (protected route).

## Usage
- Register: Go to the registration page to create a new account.
- Login: Log in using your registered credentials to access the forum features.
- Create Threads: Once logged in, you can create new discussion threads.
- Post Comments: Engage in discussions by commenting on existing threads.
- Profile Management: Edit your profile and upload a profile picture.

# License
This project is licensed under the MIT License - see the LICENSE file for details.