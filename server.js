const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { promisify } = require('util');

const renameAsync = promisify(fs.rename);

const app = express();
const PORT = process.env.PORT || 3000;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'profilepictures/'); // Destination folder for storing profile pictures
  },
  filename: function (req, file, cb) {
    const uniqueFilename = `${uuidv4()}_${file.originalname}`; // Generate unique filename
    cb(null, uniqueFilename);
  }
});

const upload = multer({ storage: storage });

// PostgreSQL configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'Discussion Forum',
  password: 'emiliancinteza',
  port: 5432, // Default PostgreSQL port
});

// Error handling for the PostgreSQL connection
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

app.use(express.json());
app.use('/profilepictures', express.static(path.join(__dirname, 'profilepictures')));
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

function isValidEmail(email) {
  // Regular expression pattern for basic email format validation
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Check if the username or email already exists
    const existingUser = await pool.query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format. Please enter a valid email address.' });
    }

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists. Please choose different credentials.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // If username or email doesn't exist and the password meets the criteria, proceed with registration
    const defaultProfilePicture = 'http://localhost:3000/profilepictures/default.jpg'; // Path to the default profile picture
    const newUser = await pool.query(
      'INSERT INTO users (username, email, password, profile_picture_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [username, email, password, defaultProfilePicture]
    );

    // Send success message
    res.status(201).json({ message: 'Account Creation Successful. Taking you to Login page' });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});




app.post('/login', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    // Query the database to check if the provided credentials are valid
    const result = await pool.query(
      'SELECT id, username FROM users WHERE (username = $1 OR email = $2) AND password = $3',
      [username, email, password]
    );

    // If a user with the provided credentials exists
    if (result.rows.length > 0) {
      const userId = result.rows[0].id; // Retrieve the user ID from the query result
      const user = { id: userId };
      const token = jwt.sign(user, 'SECRET_KEY_DF_CEC_PDC_AMPV', { expiresIn: '24h' }); // Generate JWT token

      res.json({ token });
    } else {
      res.status(401).json({ error: 'Invalid username, email, or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  jwt.verify(token, 'SECRET_KEY_DF_CEC_PDC_AMPV', (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user; // Attach user info to the request object
    next(); // Pass control to the next middleware or route handler
  });
}


// Validate token endpoint
app.post('/validateToken', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Extract user ID from the token
    const usernameResult = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
    const username = usernameResult.rows[0].username; // Retrieve username from the database

    res.json({ username }); // Send the username back to the client
  } catch (error) {
    console.error('Error retrieving username:', error);
    res.status(500).json({ error: 'Error retrieving username' });
  }
});


// Example protected route
app.get('/dashboard', authenticateToken, (req, res) => {
  res.send('Dashboard - Welcome!');
});

// Endpoint to create a new post
app.post('/createPost', authenticateToken, async (req, res) => {
  const { title, content } = req.body;

  // Check if title or content is empty or contains only whitespace
  if (!title.trim() || !content.trim()) {
    return res.status(400).json({ error: 'Post title and content cannot be empty.' });
  }

  try {
    // Insert the new post into your database
    const newPost = await pool.query(
      'INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3) RETURNING *',
      [title, content, req.user.id] // Assuming you store user ID in the token
    );

    console.log('New post created:', newPost.rows[0]); // Log the newly created post

    res.status(201).json({ message: 'Post created successfully', post: newPost.rows[0] });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.get('/recentThreads', async (req, res) => {
  try {
    const recentThreads = await pool.query(
      `SELECT posts.id, posts.title, posts.created_at, users.username
       FROM posts
       INNER JOIN users ON posts.user_id = users.id
       ORDER BY posts.created_at DESC
       LIMIT 3`
    );

    res.json(recentThreads.rows);
  } catch (error) {
    console.error('Error fetching recent threads:', error);
    res.status(500).json({ error: 'Failed to fetch recent threads' });
  }
});


app.get('/posts', async (req, res) => {
  try {
    const postsWithUsernames = await pool.query(`
      SELECT posts.*, users.username, users.profile_picture_url
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    res.json(postsWithUsernames.rows);
  } catch (err) {
    console.error('Error fetching posts with usernames', err);
    res.status(500).json({ error: 'Error fetching posts with usernames' });
  }
});

app.get('/posts/:postId', async (req, res) => {
  const postId = req.params.postId;

  try {
    const postWithUsernameAndProfile = await pool.query(`
      SELECT posts.*, users.username, users.profile_picture_url
      FROM posts
      INNER JOIN users ON posts.user_id = users.id
      WHERE posts.id = $1
    `, [postId]);

    if (postWithUsernameAndProfile.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(postWithUsernameAndProfile.rows[0]);
  } catch (err) {
    console.error('Error fetching post by ID', err);
    res.status(500).json({ error: 'Error fetching post by ID' });
  }
});

app.delete('/posts/:postId', authenticateToken, async (req, res) => {
  const postId = req.params.postId;
  const userId = req.user.id;

  try {
    // Check if the logged-in user is the author of the post
    const post = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);

    if (post.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const postUserId = post.rows[0].user_id;

    if (userId !== postUserId) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }

    // Delete associated comments first
    await pool.query('DELETE FROM comments WHERE post_id = $1', [postId]);

    // Then delete the post
    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);

    res.status(200).json({ message: 'Post and comments deleted successfully' });
  } catch (error) {
    console.error('Error deleting post and comments:', error);
    res.status(500).json({ error: 'Failed to delete post and comments' });
  }
});


app.post('/profileData', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userData = await pool.query(
      'SELECT username, email, profile_picture_url FROM users WHERE id = $1',
      [userId]
    );

    if (userData.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { username, email, profile_picture_url } = userData.rows[0];
    res.json({ username, email, profile_picture_url });
  } catch (error) {
    console.error('Error fetching profile data:', error);
    res.status(500).json({ error: 'Error fetching profile data' });
  }
});


app.post('/changePassword', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    // Check if the current password matches the one in the database
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
    const savedPassword = user.rows[0].password;

    if (savedPassword !== currentPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from the current password' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Update the password in the database
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [newPassword, userId]);
    
    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

app.put('/updateProfile', authenticateToken, async (req, res) => {
  const { username, email } = req.body;
  const userId = req.user.id;

  try {
    // Update the user's username and email in the database
    const updatedUser = await pool.query(
      'UPDATE users SET username = $1, email = $2 WHERE id = $3 RETURNING *',
      [username, email, userId]
    );

    if (updatedUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return the updated user details as a response
    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

app.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  const { commentText } = req.body;
  const postId = req.params.postId;
  const userId = req.user.id;

  try {
    // Insert the new comment into your database
    const newComment = await pool.query(
      'INSERT INTO comments (post_id, user_id, comment_text) VALUES ($1, $2, $3) RETURNING *',
      [postId, userId, commentText]
    );

    res.status(201).json({ message: 'Comment added successfully', comment: newComment.rows[0] });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

app.get('/posts/:postId/comments', async (req, res) => {
  const postId = req.params.postId;

  try {
    const postComments = await pool.query(
      `SELECT comments.*, users.username, users.profile_picture_url
       FROM comments
       INNER JOIN users ON comments.user_id = users.id
       WHERE comments.post_id = $1`,
      [postId]
    );

    res.json(postComments.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});


app.post('/uploadProfilePicture', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user.id;
    const file = req.file; // Uploaded file information

    // Ensure a file was uploaded
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const uniqueFilename = `${uuidv4()}_${file.originalname}`;
    const filePath = path.join(__dirname, 'profilepictures', uniqueFilename);
    const imageURL = `http://localhost:3000/profilepictures/${uniqueFilename}`; // Construct URL

    // Move the uploaded file to the specified storage location
    await fs.promises.rename(file.path, filePath);

    // Update the user's profile_picture_url in the database
    const updateQuery = 'UPDATE users SET profile_picture_url = $1 WHERE id = $2';
    await pool.query(updateQuery, [imageURL, userId]);

    // Clean the profilepictures directory (delete files not associated with any user)
    await cleanProfilePicturesDirectory();

    res.status(200).json({ message: 'Profile picture uploaded successfully' });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

// Function to clean the profilepictures directory
async function cleanProfilePicturesDirectory() {
  const directoryPath = path.join(__dirname, 'profilepictures');

  // Read all files in the directory
  const files = await fs.promises.readdir(directoryPath);

  // Get all profile picture URLs from the database
  const usersQuery = 'SELECT profile_picture_url FROM users';
  const userData = await pool.query(usersQuery);
  const profilePictureURLs = userData.rows.map((user) => user.profile_picture_url);

  // Keep the default profile picture filename
  const defaultPicture = 'default.jpg';

  // Iterate through each file and delete it if it's not associated with any user or not the default picture
  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    if (file !== defaultPicture && !profilePictureURLs.includes(`http://localhost:3000/profilepictures/${file}`)) {
      await fs.promises.unlink(filePath);
    }
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
