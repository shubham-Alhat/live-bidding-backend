import type { Request, Response } from "express";
import { uploadOnCloudinary } from "../lib/cloudinary.js";
import { prisma } from "../db/prisma.js";

export const createNewProduct = async (req: Request, res: Response) => {
  try {
    const { duration, intialPrice, productName } = req.body;

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

    //   create new product
    const newProduct = await prisma.product.create({
      data: {
        name: productName,
        image: cloudinaryResponse.secure_url,
        ownerId: user.id,
        initialPrice: parseFloat(intialPrice),
        durationInSeconds: parseInt(duration),
      },
    });

    if (!newProduct) {
      return res
        .status(500)
        .json({ message: "Cant create new product", data: null });
    }

    return res
      .status(201)
      .json({ message: "New product created!", data: newProduct });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in create new product", data: null });
  }
};
