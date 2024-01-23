import { Schema, model, connect } from "mongoose";
import { string } from "zod";

interface IUser {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  avtar?: string;
}

const userSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minLength: 3,
    maxLength: 30,
  },
  password: {
    type: String,
    required: true,
    minLength: 6,
  },
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxLength: 50,
  },
  avtar: {
    type: String,
  },
});

const User = model<IUser>("User", userSchema);

module.exports = {
  User,
};
