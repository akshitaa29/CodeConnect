/**
 * Generates AI-style reminder messages based on context
 */
export function generateReminderMessage({
  type,       // "24h" | "6h" | "overdue"
  taskTitle,
  groupName,
}) {
  switch (type) {
    case "24h":
      return {
        title: "⏰ Deadline approaching",
        message: `Just a heads-up! The task "${taskTitle}" is due tomorrow. 
Try to wrap up remaining work early to avoid last-minute stress.`,
        priority: "MEDIUM",
      };

    case "6h":
      return {
        title: "⚠️ Task due soon",
        message: `Only a few hours left for "${taskTitle}". 
If you're stuck, consider coordinating with your group to finish strong.`,
        priority: "HIGH",
      };

    case "overdue":
      return {
        title: "🚨 Task overdue",
        message: `The task "${taskTitle}" has crossed its deadline. 
It's important for the group’s progress to address this immediately.`,
        priority: "HIGH",
      };

    default:
      return {
        title: "Task update",
        message: `There is an update regarding "${taskTitle}".`,
        priority: "MEDIUM",
      };
  }
}