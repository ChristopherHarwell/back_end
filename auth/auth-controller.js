const db = require('../data/db-config')
const { body, check, validationResult } = require('express-validator');
const AppError = require('../utils/AppError')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { v4 } = require('uuid')

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            next(new AppError("You do not have permission to perform this action", 403))
        }
        next()
    }
}

exports.protect = async (req, res, next) => {
    let token

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1]
    }

    if (!token) {
        return next(new AppError('Please login to continue', 401))
    }

    try {
        let decoded = await jwt.verify(token, process.env.JWT_SECRET)

        const currentUser = await db('users').where({ user_id: decoded.user_id }).first()

        if (!currentUser.isAuthorized) {
            return next(new AppError("You need to be authorized to perform this action"))
        }

        if (!currentUser) {
            return next(new AppError('The User belonging to this token no longer exists', 401))
        }

        currentUser.password = undefined

        req.user = currentUser

        return next()
    } catch (error) {
        next(new AppError('Please login to continue', 401))
    }
}

exports.registerUser = async (req, res, next) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     let errMsg = errors.array()[0].msg
    //     return next(new AppError(errMsg, 400))
    // }

    let { first_name, last_name, email, password, pin } = req.body


    try {
        password = await bcrypt.hash(password, 10)

        const newUser = {
            unique_id: v4(),
            first_name,
            last_name,
            email,
            password,
            pin,
            role: 'staff',
        }

        let user = await db('users').insert(newUser).returning('*')

        // Get's user object from array
        user = user[0]

        // Hide the password before sending it to client
        user.password = undefined

        const token = signToken(user.user_id)

        res.status(201).json({
            status: 201,
            token,
            payload: {
                user
            }
        })

    } catch (error) {
        console.log(error)
        next(new AppError("Unable to register user", 500))
    }
}



exports.registerUserAsGuest = async (req, res, next) => {
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //     let errMsg = errors.array()[0].msg
    //     return next(new AppError(errMsg, 400))
    // }

    let { first_name, last_name, email, password, pin } = req.body

    try {
        password = await bcrypt.hash(password, 10)

        const newUser = {
            unique_id: v4(),
            first_name,
            last_name,
            email,
            password,
            pin,
            role: "guest",
            isAuthorized: true
        }

        let user = await db('users').insert(newUser).returning('*')

        user = user[0]

        // Hide the password before sending it to client
        user.password = undefined

        const token = signToken(user.user_id)

        res.status(201).json({
            status: 201,
            token,
            payload: {
                user
            }
        })

    } catch (error) {
        console.log(error)
        next(new AppError("Unable to register user", 500))
    }
}




exports.logIn = async (req, res, next) => {
    const { email, password } = req.body


    try {
        let user = await db('users').where({ email })

        if (user.length == 0) {
            return next(new AppError("Username does not exist", 404))
        }

        user = user[0]

        // Compare passwords
        let passwordIsCorrect = await bcrypt.compare(password, user.password)

        if (!passwordIsCorrect) {
            return next(new AppError("Invalid password", 404))
        }

        const token = signToken(user.user_id)

        // Zero out password before sending it to client
        user.password = undefined

        res.status(200).json({
            status: 200,
            message: "Welcome back",
            token,
            payload: {
                user
            }
        })

    } catch (error) {
        next(new AppError("Internal server error", 500))
    }
}

function signToken(user_id) {
    return jwt.sign({ user_id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}