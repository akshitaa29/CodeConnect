import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadProfilePhoto(file, userId) {
  if (!file) {
    throw new Error("NO_FILE_PROVIDED");
  }

  if (!file.type || !file.type.startsWith("image/")) {
    throw new Error("INVALID_FILE_TYPE");
  }

  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const storageRef = ref(storage, `profilePhotos/${userId}.jpg`);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return await getDownloadURL(storageRef);
}
