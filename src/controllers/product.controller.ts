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

export const launchProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId as string;

    const user = req.authUser;

    // check if product exist
    const isProductExist = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!isProductExist) {
      return res.status(404).json({ message: "Product not found", data: null });
    }

    // check if it is already lauched or archived
    if (isProductExist.status === "LIVE") {
      return res.status(400).json({ message: "Already launched", data: null });
    }

    const launchedProduct = await prisma.product.update({
      where: {
        id: isProductExist.id,
        name: isProductExist.name,
      },
      data: {
        status: "LIVE",
      },

      omit: {
        createdAt: true,
      },
    });

    return res
      .status(200)
      .json({ message: "Product launched", data: launchedProduct });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in launch product", data: null });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.productId as string;

    if (!productId) {
      return res
        .status(404)
        .json({ message: "product id not found", data: null });
    }

    // check if its exist
    const isExistingProduct = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!isExistingProduct) {
      return res.status(404).json({ message: "Product not found", data: null });
    }

    // delete the product
    await prisma.product.delete({
      where: {
        id: productId,
      },
    });

    return res
      .status(200)
      .json({ message: "Product deleted successfully", data: null });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in delete product", data: null });
  }
};

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user) {
      return res
        .status(400)
        .json({ message: "User not in middleware", data: null });
    }

    const allProducts = await prisma.product.findMany({
      where: {
        ownerId: user.id,
      },
    });

    return res
      .status(200)
      .json({ message: "All products owned by user", data: allProducts });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error while getting all products", data: null });
  }
};

export const getTheProduct = async (req: Request, res: Response) => {
  try {
    const productId = req.params.id as string;

    if (!productId) {
      return res
        .status(400)
        .json({ message: "id not found in params", data: null });
    }

    const existingProduct = await prisma.product.findUnique({
      where: {
        id: productId,
      },
    });

    if (!existingProduct) {
      return res
        .status(404)
        .json({ message: "product not found!", data: null });
    }

    return res
      .status(200)
      .json({ message: "get the product", data: existingProduct });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in getting product by id", data: null });
  }
};

export const getAllAuctions = async (req: Request, res: Response) => {
  try {
    const user = req.authUser;

    if (!user || user.id) {
      return res.status(404).json({ message: "User not found", data: null });
    }

    const allAuctions = await prisma.product.findMany({
      where: {
        status: "LIVE",
        NOT: {
          ownerId: user.id,
        },
      },
    });

    return res
      .status(200)
      .json({ message: "All auctions fetched.", data: allAuctions });
  } catch (error) {
    console.log(error);
    return res
      .status(500)
      .json({ message: "Error in all Auctions", data: null });
  }
};
