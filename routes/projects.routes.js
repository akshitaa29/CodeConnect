import express from "express";
import { adminDb } from "../firebase/admin.js";
import { sendErrorResponse } from "../utils/httpErrorResponse.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const snapshot = await adminDb.collection("projects").get();

    const projects = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json(projects);
  } catch (error) {
    console.error("Fetch projects error:", error);
    sendErrorResponse(res, error, 500, "Failed to load projects");
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      ownerId,
      repoLink,
      linkedInLinks,
      members,
      image,
      imageUrl,
    } = req.body;

    if (!title || !description || !category || !ownerId || !repoLink) {
      return sendErrorResponse(
        res,
        { message: "MISSING_REQUIRED_FIELDS" },
        400,
        "Please fill all required project fields"
      );
    }

    const docRef = await adminDb.collection("projects").add({
      title,
      description,
      category,
      ownerId,
      repoLink,
      linkedInLinks,
      members: Array.isArray(members) ? members : [],
      image: imageUrl || image || "",
      imageUrl: imageUrl || image || "",
    });

    res.status(201).json({
      id: docRef.id,
      title,
      description,
      category,
      ownerId,
      repoLink,
      linkedInLinks,
      members: Array.isArray(members) ? members : [],
      image: imageUrl || image || "",
      imageUrl: imageUrl || image || "",
    });
  } catch (error) {
    console.error("Create project error:", error);
    sendErrorResponse(res, error, 500, "Failed to create project");
  }
});

export default router;
