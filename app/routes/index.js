'use strict';

var express	 	= require('express');
var router 		= express.Router();
var passport 	= require('passport');

var User = require('../models/user');
var Room = require('../models/room');

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
	successRedirect: '/rooms/',
	failureRedirect: '/',
	failureFlash: true
}));

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
					console.log(newUser);
					req.flash('success', 'Your account has been created. Please log in.');
					res.redirect('/');
				});
			}
		});
	}
});

// Rooms
router.get('/rooms', [User.isAuthenticated, function(req, res, next) {
	var userId = req.user._id;
	Room.find(function(err, rooms){
		if(err) throw err;
		var i;
		//console.log(rooms);
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
router.get('/chat/:id', [User.isAuthenticated, function(req, res, next) {
	var roomId = req.params.id;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next();
		}
		//check that user in room members
		res.render('chatroom', { user: req.user, room: room });
	});

}]);

// create Chat Room
router.post('/chat/create', [User.isAuthenticated, function(req, res, next) {
	var room = {title : req.body.title, connections : [], members : [req.user._id]};
	Room.create(room, function(err, createdRoom){
		User.find(function(err, usersList){
			if(err) throw err;
			if(!usersList){
				return next();
			}
			usersList.splice(usersList.indexOf(req.user),1);
			res.render('chooseContacts', { room: createdRoom, users: usersList });
		});
	})
}]);

//add chat room member
router.put('/chat/:id/addUsers/:userId',[User.isAuthenticated, function(req, res, next) {
	var roomId = req.params.id;
	var userId = req.params.userId;
	Room.findById(roomId, function(err, room){
		if(err) throw err;
		if(!room){
			return next();
		}
		room.members.push(userId);
		Room.findByIdAndUpdate(roomId, data, function(err, room){
			User.find(function(err, usersList){
				if(err) throw err;
				if(!usersList){
					return next();
				}
				users = []
				usersList.forEach(function(user){
					if(room.members.indexOf(user._id)>-1){
						users.push(user);		
					}
				})
				usersList = users;
				res.render('chooseContacts', { room: createdRoom, users: usersList });
			});
		})
	});
}]);

// Logout
router.get('/logout', function(req, res, next) {
	// remove the req.user property and clear the login session
	req.logout();

	// destroy session data
	req.session = null;

	// redirect to homepage
	res.redirect('/');
});

module.exports = router;
