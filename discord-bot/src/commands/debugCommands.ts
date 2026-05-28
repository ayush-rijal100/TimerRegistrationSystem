import axios from "axios";
import { BotMessage } from "../actions/aiActionExecutor";
import { checkHealth, resolveExternalIdentity } from "../trsApi";
import { getPendingAiAction, getPendingTimeEntry } from "../sessionStore";

function getErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (data && typeof data === "object" && "message" in data && typeof data.message === "string") {
    return data.message;
  }

  if (typeof data === "string" && data.trim().length > 0) {
    return data;
  }

  return fallback;
}

export async function handleDebugCommand(message: BotMessage): Promise<boolean> {
  const content = message.content.trim().toLowerCase();

  if (content === "trs health") {
    try {
      const healthMessage = await checkHealth();
      await message.reply(`Backend says: ${healthMessage}`);
    } catch (error) {
      console.error(error);
      await message.reply(
        getErrorMessage(error, "I could not reach the Timer Registration API. Please check if Spring Boot is running on port 8080.")
      );
    }

    return true;
  }

  if (content === "trs whoami") {
    try {
      const currentUser = await resolveExternalIdentity("DISCORD", message.author.id);

      await message.reply(
        [
          `Discord identity mapped to TRS user: ${currentUser.fullName}.`,
          `Email: ${currentUser.email}`,
          `Role: ${currentUser.role}`,
          "No Discord password login was needed."
        ].join("\n")
      );
    } catch (error) {
      console.error(error);
      await message.reply(
        `Your Discord account is not linked to a TRS user yet: ${getErrorMessage(error, "Ask an admin to map your Discord account.")}`
      );
    }

    return true;
  }

  if (content === "trs status") {
    let backendStatus = "Offline";
    let identityStatus = "Unmapped";
    let mappedUser = "-";

    try {
      await checkHealth();
      backendStatus = "Online";
    } catch (error) {
      console.error(error);
    }

    try {
      const currentUser = await resolveExternalIdentity("DISCORD", message.author.id);
      identityStatus = "Mapped";
      mappedUser = `${currentUser.fullName} (${currentUser.role})`;
    } catch (error) {
      console.error(error);
    }

    await message.reply(
      [
        "TRS Bot Status:",
        `Backend: ${backendStatus}`,
        `Discord identity: ${identityStatus}`,
        `Mapped user: ${mappedUser}`,
        `Pending time entry: ${getPendingTimeEntry(message.author.id) ? "Yes" : "No"}`,
        `Pending AI action: ${getPendingAiAction(message.author.id) ? "Yes" : "No"}`,
        "Mode: Natural-language + Discord identity"
      ].join("\n")
    );

    return true;
  }

  return false;
}