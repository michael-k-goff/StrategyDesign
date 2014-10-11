#StrategyDesign

This is an experiment in automated game design.  In the future, I hope for this to be a system that can create a novel and entertaining game that matches a player's specifications, whether they be general or specific.  For now, it is a bare bones node.js app.

##How to use the app

Right now, there is only one template, a minimalist RPG template that only allows a player to specify the number of screens in the game.  To create and play, register an account with the app and log in, select the RPG template, select the name of the game and the desired length, and you are playing.  You can save the game through the in-game menu.

To play the RPG, use enter to summon and navigate menus, arrows to walk, and backspace to back through menus.

If you have already created a game, it will appear on the main page of the app.  You can play the game again, and it will automatically load your saved game from before.

There are several buttons at the bottom.  These are not meant for general usage, but they help for development.

##The stack

StrategyDesign is a node.js app.  It serves games in HTML5, and so in theory, any device capable of HTML5 should be able to interface with StrategyDesign.  Support for mobile gaming is still in the future, however.  Graphics are done with WebGL.

MongoDB is the database of choice.  All username and game information is stored in a Mongo database.  For each individual game, assets are stored in RDF.

StrategyDesign also uses jade for simple webpage templating and passport for user authentication.

##Set up

I am developing on a Windows 7 machine, and I have only tested the games in Chrome.  Development began on Ubuntu, and I see no obvious reason why it shouldn't work on other systems.  To get StrategyDesign working, you will need node.js and MongoDB installed.  In addition, you will need the following node packages: express, jade, connect-flash, rdfstore, mongoose, passport, passport-local, and passport-facebook.  I think that's all.  They can all be installed via the node package manager (npm): imp install [package name].

If you want to deploy to Heroku or elsewhere, be my guest.

##Known issues

This could be the longest section of the readme.

* The template and the system as a whole are woefully incomplete.
* Issues with Internet Explorer and Firefox.
* Game generation is slow.  For that reason, the RPG is capped at 1000 screens.

##About me and the project

I began StrategyDesign in pursuit of an ambitious goal: build a system that is capable of automatically creating games that are both fun and novel, subject to a user's specifications, however specific or general they may be.  Right now, there is only a bare-bones RPG template, but in the future I plan for that template to be fully fleshed out.  In addition, I want to add other templates, including a 4X template and a simple "Arcade" template, which understands games at the most basic level of moving and interacting objects.

I have a lot of ideas for how to do sophisticated design.  For instance, in the RPG template, a user could specify which stats a player should have and the formulas for flow of battle and effectiveness of moves.  A genetic algorithm could then learn a good strategy for that system, which in turn could be used to calibrate difficulty and balance properly.  Classification algorithms such as k-means can be used to learn from previous games such things as which enemies to allocate to which areas, what kinds of plot turns should be introduced at which points, and so on.  I also want natural language game specifications that give a lot of flexibility to a player who lacks programming experience.

Still, the above is highly formulaic.  How can the system be programmed to create games that are truly novel?  I don't have a good answer to this question, but I am thinking about it.

StrategyDesign began as a business idea, though now it is a hobby.  I have no formal software development or game design experience, as the appearance of the app will no doubt make obvious, but I've taken the opportunity to learn about web development, machine learning, and the semantic web.  Almost everything in this project was a new skill for me.  I would very much like to work in the general area of data science, machine learning, or artificial intelligence.