let doctorTabSwipeBlocked = false;

export const setDoctorTabSwipeBlocked = (blocked: boolean) => {
  doctorTabSwipeBlocked = blocked;
};

export const isDoctorTabSwipeBlocked = () => doctorTabSwipeBlocked;
