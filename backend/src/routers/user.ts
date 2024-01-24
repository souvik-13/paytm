import express, { Request, Response, Router } from "express";
import fs from "fs";
import path from "path";
import z from "zod";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Account, User } from "../db/DB";
import { JWT_SECRET } from "../config";
import authMiddleware from "../middlewares/authMiddleware";

const logFile = path.join(__dirname, "../../logs/user.log");

const saltRounds = 10;

const router = express.Router();
/*
  default route -> /api/v1/user
  User routes -> 
    method       route          body
    POST         /signup        {username, email, password, firstName, lastName}
    POST         /signin        {username, password}
    PUT          /              {password, firstName, lastName}
    GET          /bulk          {filter}
*/

const signupBody = z.object({
  username: z.string(),
  email: z.string().email(),
  password: z
    .string()
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/),
  firstName: z.string(),
  lastName: z.string(),
});
router.post("/signup", async (req, res) => {
  try {
    const { success } = signupBody.safeParse(req.body);

    if (!success) {
      return res.status(411).json({
        message: "Incorrect inputs",
      });
    }

    const existingUser = await User.findOne({
      username: req.body.username,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already taken",
      });
    }

    try {
      let password_hash = await bcrypt.hash(req.body.password, saltRounds);

      const newUser = await User.create({
        username: req.body.username,
        email: req.body.email,
        password: password_hash,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
      });

      const userId = newUser._id;

      await Account.create({
        userId,
        balance: Math.floor(1 + Math.random() * 10000),
      });

      const token = jwt.sign({ userId }, JWT_SECRET);
      res.json({
        message: "User created successfully",
        token: token,
      });
    } catch (err) {
      fs.appendFileSync(logFile, `${new Date().toISOString()} ${err}\n`);
      res.status(500).json({
        message: "Internal server error",
      });
    }
  } catch (error) {
    fs.appendFileSync(
      logFile,
      `${new Date().toISOString()}\n route: /signup \n ${error}\n`,
    );
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

const signinBody = z.object({
  username: z.string(),
  password: z.string(),
});
router.post("/signin", async (req, res) => {
  try {
    const { success } = signinBody.safeParse(req.body);

    if (!success) {
      return res.status(411).json({
        message: "Error while logging in",
      });
    }

    let user;
    // check if username is of type email
    if (req.body.username.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
      user = await User.findOne({
        email: req.body.email,
      });
    } else {
      user = await User.findOne({
        username: req.body.username,
      });
    }

    if (user) {
      const correct_pass = await bcrypt.compare(
        req.body.password,
        user.password,
      );
      if (correct_pass) {
        const token = jwt.sign(
          {
            userId: user._id,
          },
          JWT_SECRET,
        );

        res.json({
          token: token,
        });
        return;
      }
    }

    res.status(411).json({
      message: "Error while logging in",
    });
  } catch (error) {
    fs.appendFileSync(
      logFile,
      `${new Date().toISOString()}\n route: /signin \n ${error}\n`,
    );
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

interface CustomRequest extends Request {
  userId?: string;
}
const updateBody = z.object({
  password: z
    .string()
    .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/)
    .optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});
router.put("/", authMiddleware, async (req: CustomRequest, res: Response) => {
  try {
    const { success } = updateBody.safeParse(req.body);
    if (!success) {
      return res.status(411).json({
        message: "Error while updating information",
      });
    }

    try {
      const updatedUser = await User.findByIdAndUpdate(req.userId, req.body);
      if (updatedUser) {
        return res.json({
          message: "Updated successfully",
        });
      } else throw new Error("Error while updating information");
    } catch (error) {
      return res.status(411).json({
        message: "Error while updating information",
      });
    }
  } catch (error) {
    fs.appendFileSync(
      logFile,
      `${new Date().toISOString()}\n route: / \n ${error}\n`,
    );
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/bulk", async (req, res) => {
  try {
    const filter = req.query.filter ? req.query.filter : "";
    const users = await User.find({
      $or: [
        {
          firstName: {
            $regex: filter,
          },
        },
        {
          lastName: {
            $regex: filter,
          },
        },
      ],
    });
    res.json(
      users.map((user) => ({
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        _id: user._id,
        avatar: user.avtar,
      })),
    );
  } catch (error) {
    fs.appendFileSync(
      logFile,
      `${new Date().toISOString()}\n route: /bulk \n ${error}\n`,
    );
    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export { router };
