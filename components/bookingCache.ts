// utils/bookingCache.ts
export const getCachedBookingData = () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const hotelInfo = localStorage.getItem('booking_hotel_info');
    const roomInfo = localStorage.getItem('booking_room_info');
    
    if (hotelInfo && roomInfo) {
      return {
        hotel: JSON.parse(hotelInfo),
        room: JSON.parse(roomInfo)
      };
    }
    return null;
  } catch (error) {
    console.error('Error reading booking cache:', error);
    return null;
  }
};

export const clearBookingCache = () => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('booking_hotel_info');
    localStorage.removeItem('booking_room_info');
    localStorage.removeItem('booking_selected_hotel');
  } catch (error) {
    console.error('Error clearing booking cache:', error);
  }
};