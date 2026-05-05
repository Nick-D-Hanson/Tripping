export function actionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function tripNoticeMessage(notice: string | string[] | undefined) {
  if (Array.isArray(notice)) return null;

  switch (notice) {
    case "trip-created":
      return "Trip created. You can start building the route, timeline, and collaborators now.";
    case "trip-updated":
      return "Trip details updated.";
    case "trip-deleted":
      return "Trip deleted.";
    default:
      return null;
  }
}
