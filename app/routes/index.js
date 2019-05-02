'use strict';

var express	 	= require('express');
var router 		= express.Router();
var passport 	= require('passport');

var User = require('../models/user');
var Room = require('../models/room');

var jwt = require('jsonwebtoken');

// Home page
router.get('/', function(req, res, next) {
	// If user is already logged in, then redirect to rooms page
	if(req.isAuthenticated()){
		res.redirect('/rooms');
	}
	else{
		res.render('login', {
			success: req.flash('success')[0],
			errors: req.flash('error'),
			showRegisterForm: req.flash('showRegisterForm')[0]
		});
	}
});

// Login
router.post('/login', passport.authenticate('local', {
	successRedirect: '/token',
	failureRedirect: '/',
	failureFlash: true
}));

router.get('/token', function (req, res, next){
	jwt.sign({user: req.user}, 'secretKey', { expiresIn: '24h' }, (err, token)=>{
		if(err) throw err;
		console.log("token")
		console.log(token)
		res.cookie('token', token, { maxAge: 86400 }).redirect('/rooms');
	})
})

// Register via username and password
router.post('/register', function(req, res, next) {

	var credentials = {'username': req.body.username, 'password': req.body.password };

	if(credentials.username === '' || credentials.password === ''){
		req.flash('error', 'Missing credentials');
		req.flash('showRegisterForm', true);
		res.redirect('/');
	}else{

		// Check if the username already exists for non-social account
		User.findOne({'username': new RegExp('^' + req.body.username + '$', 'i'), 'socialId': null}, function(err, user){
			if(err) throw err;
			if(user){
				req.flash('error', 'Username already exists.');
				req.flash('showRegisterForm', true);
				res.redirect('/');
			}else{
				User.create(credentials, function(err, newUser){
					if(err) throw err;
					req.flash('success', 'Your account has been created. Please log in.');
					res.redirect('/');
				});
			}
		});
	}
});

// Rooms
router.get('/rooms', [ User.isAuthenticated, verifyToken, function(req, res, next) {
	var userId = req.user._id;
	Room.find(function(err, rooms){
		if(err) throw err;
		var i;
		var tempRooms = []
		for(i in rooms){
			if(rooms[i].members.includes(userId)){
				tempRooms.push(rooms[i]);
			}
		}
		rooms = tempRooms
		User.find(function(err, userstmp){
			var users = []
			if(err) res.render('rooms', { rooms, users});
			userstmp.forEach(function(user) {
				if (!user._id.equals(req.user._id)){
					users.push(user)
				}
			})
			res.render('rooms', { rooms, users });
		})
	});
}]);

// Chat Room
router.get('/chat/:id', [User.isAuthenticated, verifyToken, function(req, res, next) {
	var roomId = req.params.id;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next();
		}
		if(room.members.indexOf(req.user._id)<0){
			return next();
		}
		//check that user in room members
		res.render('chatroom', { user: req.user, room: room });
	});
}]);

// create Chat Room
router.post('/chat/create', [User.isAuthenticated, verifyToken, function(req, res, next) {
	var room = {title : req.body.title, connections : [], members : [req.user._id]};
	Room.create(room, function(err, createdRoom){
		User.find(function(err, usersList){
			if(err) throw err;
			if(!usersList){
				return next();
			}
			var i;
			var usersDone = []
			for(i in usersList){
				if(!usersList[i]._id.equals(req.user._id)){
					usersDone.push(usersList[i]);
				}
			}
			usersList = usersDone;
			res.render('chooseContacts', { room: createdRoom, users: usersList });
		});
	})
}]);

//add chat room member
router.post('/chat/:id/addUsers/:userId',[User.isAuthenticated, verifyToken, function(req, res, next) {
	console.log("Inside add user")
	var roomId = req.params.id;
	var userId = req.params.userId;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next();
		}
		room.members.push(userId);
		Room.findByIdAndUpdate(roomId, {members: room.members}, function(err, room){
			User.find(function(err, usersList){
				if(err) throw err;
				if(!usersList){
					return next();
				}
				var users = []
				usersList.forEach(function(user){
					if(room.members.indexOf(user._id)<0){
						users.push(user);
					}
				})
				usersList = users;
				res.render('chooseContacts', { room: room, users: usersList });
			});
		})
	});
}]);

//private chat
router.get("/privateroom/:userId", [User.isAuthenticated, function(req, res, next) {
	var userId = req.params.userId;
	User.findById(userId, function(err, user){
		if(err) throw err;
		if(!user){
			return next();
		}
		var room = {title : req.user.username + " - " + user.username, connections : [], members : [req.user._id, user._id]};
		Room.create(room, function(err, createdRoom){
			if(err) throw err;
			if(!createdRoom){
				return next();
			}
			res.render('chatroom', { user: req.user, room: createdRoom });
		});
	
	})
}])


// Logout
router.get('/logout', function(req, res, next) {
	// remove the req.user property and clear the login session
	req.logout();

	// destroy session data
	req.session = null;

	// remove token from cookie
	res.clearCookie("token");

	// redirect to homepage
	res.redirect('/');
});

// Verify Token
function verifyToken(req, res, next){
	const { token } = req.cookies;
	// const token = null
	jwt.verify(token, 'secretKey', (err, authData)=>{
		if(err) res.sendStatus(403);
		else next();
	});
}

function authenticate(req, res, next){
	passport.authenticate('local', {
		failureRedirect: '/',
		failureFlash: true
	},()=>{console.log("success"), next()})
}

module.exports = router;
