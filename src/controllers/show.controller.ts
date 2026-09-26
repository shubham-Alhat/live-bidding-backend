import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { uploadOnCloudinary } from "../lib/cloudinary.js";

export const getAllShows = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not in middleware", data: null });
    }

    const allShows = await prisma.show.findMany({
      where: {
        ownerId: user.id,
      },
    });

    return res
      .status(200)
      .json({ message: "All shows owned by user", data: allShows });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while getting all shows", data: null });
  }
};

export const createNewShow = async (req: Request, res: Response) => {
  try {
    const { showTitle, showDescription } = req.body;

    const user = req.authUser;

    if (!user || !user.id) {
      return res
        .status(404)
        .json({ message: "authUser not found", data: null });
    }

    //   get the image url
    let cloudinaryResponse;
    if (req.file?.path) {
      cloudinaryResponse = await uploadOnCloudinary(req.file?.path);
    }

    if (!cloudinaryResponse?.secure_url) {
      return res
        .status(500)
        .json({ message: "secure url not found", data: null });
    }

    //   create new show
    const newShow = await prisma.show.create({
      data: {
        name: showTitle,
        description: showDescription,
        thumbnail: cloudinaryResponse.secure_url,
        ownerId: user.id,
      },
    });

    if (!newShow) {
      return res
        .status(500)
        .json({ message: "Cant create new show", data: null });
    }

    return res
      .status(201)
      .json({ message: "New Show created!", data: newShow });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in create new show", data: null });
  }
};

export const getShowById = async (req: Request, res: Response) => {
  try {
    const showId = req.params.id as string;

    if (!showId) {
      return res
        .status(400)
        .json({ message: "id not found in params", data: null });
    }

    const existingShow = await prisma.show.findUnique({
      where: {
        id: showId,
      },
    });

    if (!existingShow) {
      return res.status(404).json({ message: "show not found!", data: null });
    }

    return res
      .status(200)
      .json({ message: "get the show", data: existingShow });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting show by id", data: null });
  }
};
