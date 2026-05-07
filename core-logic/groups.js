import {
  createGroupInDB,
  getGroupById,
  updateGroupMembers,
  getGroupsByEmail,
} from "../firebase/groups.js";

import { getMatchedUsers } from "../firebase/matches.js";
import { getProfileByEmail, getProfilesByEmails } from "../firebase/profiles.js";

/**
 * CREATE GROUP
 */
export async function handleCreateGroup(
  email,
  name,
  description,
  groupType,
  memberEmails = []
) {
  if (!email || !name || !description || !groupType) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  if (!["inhouse", "hackathon"].includes(groupType)) {
    throw new Error("INVALID_GROUP_TYPE");
  }

  return await createGroupInDB({
    name,
    description,
    groupType,
    createdBy: email,
    members: memberEmails,
  });
}

/**
 * GET ELIGIBLE MEMBERS (BASED ON GROUP TYPE)
 */
export async function getEligibleGroupMembers(email, groupType) {
  if (!email || !groupType) {
    throw new Error("MISSING_PARAMS");
  }

  const creatorProfile = await getProfileByEmail(email);
  if (!creatorProfile) {
    throw new Error("PROFILE_NOT_FOUND");
  }

  const matchedEmails = await getMatchedUsers(email);
  const matchedProfiles = await getProfilesByEmails([...matchedEmails]);

  if (groupType === "inhouse") {
    return matchedProfiles.filter(
      p => p.batch === creatorProfile.batch
    );
  }

  if (groupType === "hackathon") {
    return matchedProfiles;
  }

  throw new Error("INVALID_GROUP_TYPE");
}

/**
 * ADD MEMBER (ADMIN ONLY)
 */
export async function handleAddMember(
  adminEmail,
  groupId,
  memberEmail
) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");

  if (group.createdBy !== adminEmail) {
    throw new Error("ONLY_ADMIN_CAN_ADD");
  }

  if (group.members.includes(memberEmail)) {
    throw new Error("ALREADY_MEMBER");
  }

  group.members.push(memberEmail);
  await updateGroupMembers(groupId, group.members);

  return { groupId, members: group.members };
}

/**
 * REMOVE MEMBER (ADMIN ONLY)
 */
export async function handleRemoveMember(
  adminEmail,
  groupId,
  memberEmail
) {
  const group = await getGroupById(groupId);
  if (!group) throw new Error("GROUP_NOT_FOUND");

  if (group.createdBy !== adminEmail) {
    throw new Error("ONLY_ADMIN_CAN_REMOVE");
  }

  const updatedMembers = group.members.filter(
    m => m !== memberEmail
  );

  await updateGroupMembers(groupId, updatedMembers);

  return { groupId, members: updatedMembers };
}

/**
 * GET MY GROUPS
 */
export async function handleGetMyGroups(email) {
  if (!email) throw new Error("EMAIL_REQUIRED");
  return await getGroupsByEmail(email);
}

/**
 * GET GROUP DETAILS
 */
export async function handleGetGroupDetails(groupId, email) {
  if (!groupId || !email) {
    throw new Error("MISSING_PARAMS");
  }

  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error("GROUP_NOT_FOUND");
  }

  if (!group.members.includes(email)) {
    throw new Error("NOT_A_GROUP_MEMBER");
  }

  const memberProfiles = await getProfilesByEmails(group.members);
  const memberProfileMap = new Map(
    memberProfiles.map((profile) => [profile.email, profile])
  );

  return {
    ...group,
    memberProfiles: group.members.map((memberEmail) => {
      const profile = memberProfileMap.get(memberEmail);
      return {
        email: memberEmail,
        name: profile?.name || memberEmail,
        batch: profile?.batch || "",
        profilePhoto: profile?.photoURL || profile?.profilePhoto || "",
      };
    }),
  };
}

export async function exitGroup(groupId, userId) {
  if (!groupId || !userId) {
    throw new Error("MISSING_PARAMS");
  }

  const group = await getGroupById(groupId);
  if (!group) {
    throw new Error("GROUP_NOT_FOUND");
  }

  const updatedMembers = (group.members || []).filter(
    (memberId) => memberId !== userId
  );

  await updateGroupMembers(groupId, updatedMembers);

  return { success: true, groupId, members: updatedMembers };
}
