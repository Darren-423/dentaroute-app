import {
    Booking,
    ChatRoom,
    DoctorProfile,
    PatientCase,
    Review,
    store,
} from "./store";

export type DoctorDashboardData = {
  cases: PatientCase[];
  bookings: Booking[];
  unreadCount: number;
  patientProfileImage: string | null;
  unreadMessages: number;
};

export type DoctorProfileStats = {
  cases: number;
  quoted: number;
  booked: number;
  reviews: number;
  avgRating: number;
};

export type DoctorProfileData = {
  profile: DoctorProfile | null;
  stats: DoctorProfileStats;
};

const dashboardCache: DoctorDashboardData = {
  cases: [],
  bookings: [],
  unreadCount: 0,
  patientProfileImage: null,
  unreadMessages: 0,
};

let chatRoomsCache: ChatRoom[] = [];

const profileCache: DoctorProfileData = {
  profile: null,
  stats: { cases: 0, quoted: 0, booked: 0, reviews: 0, avgRating: 0 },
};

const cloneRooms = (rooms: ChatRoom[]) => rooms.map((room) => ({ ...room }));

export const getDoctorDashboardCache = (): DoctorDashboardData => ({
  cases: dashboardCache.cases.map((item) => ({ ...item })),
  bookings: dashboardCache.bookings.map((item) => ({ ...item })),
  unreadCount: dashboardCache.unreadCount,
  patientProfileImage: dashboardCache.patientProfileImage,
  unreadMessages: dashboardCache.unreadMessages,
});

export const loadDoctorDashboardData = async (): Promise<DoctorDashboardData> => {
  const [cases, bookings, unreadCount, patientProfile, rooms] = await Promise.all([
    store.getCases(),
    store.getBookings(),
    store.getUnreadCount("doctor"),
    store.getPatientProfile(),
    store.getChatRooms(),
  ]);

  const sortedCases = cases.filter(c => !c.hidden).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const unreadMessages = rooms.reduce((sum, room) => sum + (room.unreadDoctor || 0), 0);

  dashboardCache.cases = sortedCases;
  dashboardCache.bookings = bookings;
  dashboardCache.unreadCount = unreadCount;
  dashboardCache.patientProfileImage = patientProfile?.profileImage || null;
  dashboardCache.unreadMessages = unreadMessages;

  return getDoctorDashboardCache();
};

export const getDoctorChatRoomsCache = (): ChatRoom[] => cloneRooms(chatRoomsCache);

export const loadDoctorChatRooms = async (markAsRead = false): Promise<ChatRoom[]> => {
  const user = await store.getCurrentUser();
  const name = user?.name || "Doctor";
  const rooms = await store.getChatRoomsForUser("doctor", name);
  const sortedRooms = [...rooms].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  if (markAsRead) {
    for (const room of sortedRooms) {
      if (room.unreadDoctor > 0) {
        await store.markAsRead(room.id, "doctor");
      }
    }

    const refreshedRooms = await store.getChatRoomsForUser("doctor", name);
    chatRoomsCache = [...refreshedRooms].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    );
    return getDoctorChatRoomsCache();
  }

  chatRoomsCache = sortedRooms;
  return getDoctorChatRoomsCache();
};

export const getDoctorProfileCache = (): DoctorProfileData => ({
  profile: profileCache.profile ? { ...profileCache.profile } : null,
  stats: { ...profileCache.stats },
});

export const loadDoctorProfileData = async (): Promise<DoctorProfileData> => {
  const profile = await store.getDoctorProfile();
  const cases = await store.getCases();
  const reviews: Review[] = profile?.fullName ? await store.getReviewsForDentist(profile.fullName) : [];
  const avgRating = reviews.length > 0 ? reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length : 0;

  profileCache.profile = profile || null;
  profileCache.stats = {
    cases: cases.length,
    quoted: cases.filter((item) => item.status === "quotes_received").length,
    booked: cases.filter((item) => item.status === "booked").length,
    reviews: reviews.length,
    avgRating,
  };

  return getDoctorProfileCache();
};

export const warmDoctorTabData = async () => {
  await Promise.all([
    loadDoctorDashboardData(),
    loadDoctorChatRooms(false),
    loadDoctorProfileData(),
  ]);
};