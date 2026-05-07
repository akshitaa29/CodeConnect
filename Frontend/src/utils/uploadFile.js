import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

export async function uploadFile(file, path) {
  if (!file) {
    const error = new Error("Please choose a file first.");
    error.code = "NO_FILE_PROVIDED";
    throw error;
  }

  if (!path) {
    throw new Error("Upload path is required.");
  }

  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
