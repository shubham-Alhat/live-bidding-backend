import type { Request, Response } from "express";
import { prisma } from "../db/prisma.js";
import { uploadOnCloudinary } from "../lib/cloudinary.js";
import { v2 as cloudinary } from "cloudinary";

export const getAllShowsOfSeller = async (req: Request, res: Response) => {
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
    const { showTitle, showDescription, startsAt, tags } = req.body;

    if (!showDescription || !showTitle) {
      return res
        .status(404)
        .json({ message: "Show details not found", data: null });
    }

    const startsAtDate = new Date(startsAt);

    if (isNaN(startsAtDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (startsAtDate.getTime() <= Date.now()) {
      return res
        .status(400)
        .json({ message: "Show must be scheduled in the future" });
    }

    if (JSON.parse(tags).length === 0) {
      return res
        .status(400)
        .json({ message: "Please provide atleast one tag for show" });
    }

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
        .json({ message: "cloudinary secure url not found", data: null });
    }

    // create new show
    const newShow = await prisma.show.create({
      data: {
        name: showTitle,
        description: showDescription,
        thumbnail: cloudinaryResponse.secure_url,
        thumbnail_public_id: cloudinaryResponse.public_id,
        ownerId: user.id,
        scheduledAt: startsAtDate,
        tags: JSON.parse(tags),
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

export const deleteShow = async (req: Request, res: Response) => {
  try {
    const showId = req.params.showId as string;

    if (!showId) {
      return res
        .status(400)
        .json({ message: "show id not found in params", data: null });
    }

    const user = req.authUser;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized", data: null });
    }

    const deletedShow = await prisma.show.delete({
      where: {
        id: showId,
        ownerId: user.id,
      },
    });

    if (!deletedShow) {
      return res
        .status(404)
        .json({ message: "deleted show not found in db", data: null });
    }

    // also delete the thumbnail from cloudinary
    await cloudinary.uploader.destroy(deletedShow.thumbnail_public_id, {
      invalidate: true,
    });

    return res
      .status(200)
      .json({ message: "show deleted successfully", data: null });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while deleting show", data: null });
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

    const user = req.authUser;

    if (!user || !user.id) {
      return res
        .status(404)
        .json({ message: "authUser not found", data: null });
    }

    //  existence + ownership in ONE query
    const existingShow = await prisma.show.findUnique({
      where: {
        id: showId,
        ownerId: user.id,
      },
      include: {
        owner: true,
      },
    });

    if (!existingShow) {
      return res.status(404).json({ message: "show not found!", data: null });
    }

    return res.status(200).json({ message: "Your show", data: existingShow });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting show by id", data: null });
  }
};

export const getShowMetaData = async (req: Request, res: Response) => {
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

    return res.status(200).json({
      message: "Show MetaData fecthed successfully",
      data: existingShow,
    });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting showMetaData", data: null });
  }
};
