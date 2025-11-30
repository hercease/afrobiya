"use client";
import { Button } from "@/components/ui/button";
import { useRouter,usePathname,useSearchParams  } from 'next/navigation';
import {
  MapPin,
  Wifi,
  Car,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import HotelPoliciesDialog from "./hotel-info-dilaog";
import HotelInfoSheet from "./hotel-info-sheet";
import RoomInfoSheet from "./room-info";
import Link from "next/link";
import { getFacilityIcon, FacilityIcon } from './facilities-icons';

interface HotelResultsProps {
  loading?: boolean;
}

// Cache keys
const CACHE_KEYS = {
  HOTEL_INFO: 'booking_hotel_info',
  ROOM_INFO: 'booking_room_info',
  SELECTED_HOTEL: 'booking_selected_hotel',
  TIMER_STORAGE_KEY : 'booking_session_start_time'
};

// Function to format room display
const formatRoomDisplay = (roomsArray: string[]): string => {
  const roomCounts: { [key: string]: number } = {};
  
  roomsArray.forEach(room => {
    // Clean up room names (remove extra spaces, etc.)
    const cleanRoom = room.trim();
    roomCounts[cleanRoom] = (roomCounts[cleanRoom] || 0) + 1;
  });
  
  const roomEntries = Object.entries(roomCounts);
  
  if (roomEntries.length === 1) {
    // Single room type (could be multiple quantities)
    const [roomType, count] = roomEntries[0];
    return `${count} × ${roomType}`;
  } else {
    // Multiple room types
    return roomEntries.map(([roomType, count]) => `${count} × ${roomType}`).join(' + ');
  }
};

const HotelResults = ({ loading, results }: { loading?: boolean; results: any }) => {
  const [isPoliciesDialogOpen, setIsPoliciesDialogOpen] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [isHotelInfoSheetOpen, setIsHotelInfoSheetOpen] = useState(false);
  const [selectedHotelForInfo, setSelectedHotelForInfo] = useState<HotelType["hotelInfo"][]>([]);
  const [showRoomsForHotel, setShowRoomsForHotel] = useState<number | null>(null);
  const [isRoomInfoSheetOpen, setIsRoomInfoSheetOpen] = useState(false);
  const [selectedRoomFeatures, setSelectedRoomFeatures] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<{
    Category: string;
    Currency: string;
    HotelSearchCode: string;
    Remark: string;
    Rooms: string[];
    Special: string;
    TotalPrice: number;
    RoomBasis: string;
  } | undefined>(undefined);
  const [destinationname, setDestinationname] = useState<string | null>("");
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [filteredHotels, setFilteredHotels] = useState<any[]>([]);

  const router = useRouter();
  const params = useSearchParams();

  const checkIn = params.get("checkIn");
  const checkOut = params.get("checkOut");
  const totalRooms = params.get("totalRooms");

  // Cache management functions
  const saveToCache = (key: string, data: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Error saving to cache:', error);
      }
    }
  };

  const getFromCache = (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.error('Error reading from cache:', error);
        return null;
      }
    }
    return null;
  };

  const clearCache = () => {
    if (typeof window !== 'undefined') {
      try {
        Object.values(CACHE_KEYS).forEach(key => {
          localStorage.removeItem(key);
        });
      } catch (error) {
        console.error('Error clearing cache:', error);
      }
    }
  };

  // Function to handle book button click
  const handleBookClick = (hotel: HotelType, room: any) => {
    // Save hotel information to cache
    const hotelInfo = {
      ...hotel,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      totalRooms: totalRooms,
      searchParams: buildQueryString()
    };

    // Save room information to cache
    const roomInfo = {
      ...room,
      hotelName: hotel.HotelName,
      hotelImage: hotel.HotelImage,
      hotelAddress: hotel.hotelInfo?.address,
      formattedRoomName: formatRoomDisplay(room.Rooms || []) // Add formatted room name
    };

    localStorage.removeItem(CACHE_KEYS.TIMER_STORAGE_KEY);
    const now = Math.floor(Date.now() / 1000);
    localStorage.setItem(CACHE_KEYS.TIMER_STORAGE_KEY, now.toString());

    // Save to cache
    saveToCache(CACHE_KEYS.HOTEL_INFO, hotelInfo);
    saveToCache(CACHE_KEYS.ROOM_INFO, roomInfo);
    saveToCache(CACHE_KEYS.SELECTED_HOTEL, {
      hotelCode: hotel.HotelCode,
      hotelSearchCode: room.HotelSearchCode
    });

    console.log('Saved to cache:', {
      hotel: hotelInfo,
      room: roomInfo
    });

    // Navigate to booking page
    router.push(`/booking-payment?hotelSearchCode=${room.HotelSearchCode}&hotelCode=${hotel.HotelCode}&totalRooms=${totalRooms}&checkInDate=${checkIn}&checkOutDate=${checkOut}&${buildQueryString()}`);
  };

  // Function to check if a hotel/room is currently cached
  const isCurrentlyCached = (hotelCode: number, roomSearchCode: string) => {
    const cachedHotel = getFromCache(CACHE_KEYS.SELECTED_HOTEL);
    return cachedHotel && 
           cachedHotel.hotelCode === hotelCode && 
           cachedHotel.hotelSearchCode === roomSearchCode;
  };

  const buildQueryString = () => {
    const queryParams = [];
    const totalRooms = Number.parseInt(params.get("totalRooms") || "1");

    for (let i = 1; i <= totalRooms; i++) {
      queryParams.push(`adult${i}=${encodeURIComponent(params.get(`adult${i}`) || "1")}`);
      queryParams.push(`children${i}=${encodeURIComponent(params.get(`children${i}`) || "0")}`);
      queryParams.push(`childrenAges${i}=${encodeURIComponent(params.get(`childrenAges${i}`) || "0")}`);
    }

    return queryParams.join('&');
  };

  const [showRooms, setShowRooms] = useState(false);
  const handlePoliciesClick = (hotelName: string) => {
    setSelectedHotel(hotelName);
    setIsPoliciesDialogOpen(true);
  };

  const handleShowRoomsClick = (hotelCode: number) => {
    setShowRoomsForHotel(showRoomsForHotel === hotelCode ? null : hotelCode);
  };

  const handleHotelInfoClick = (hotelInfo: HotelType["hotelInfo"][]) => {
    setSelectedHotelForInfo(hotelInfo);
    setIsHotelInfoSheetOpen(true);
  };

  const handleRoomInfoClick = (room: {
    Category: string;
    Currency: string;
    HotelSearchCode: string;
    Remark: string;
    Rooms: string[];
    Special: string;
    TotalPrice: number;
    RoomBasis: string;
  }, roomFeatures: any[]) => {
    setSelectedRoom(room);
    setSelectedRoomFeatures(roomFeatures);
    setIsRoomInfoSheetOpen(true);
  };

  useEffect(() => {
    const destination = params.get("destinationDisplay");
    const facilitiesParam = params.get("amenities");
    if (destination) {
      setDestinationname(destination);
    }

    if (facilitiesParam) {
      const facilitiesArray = facilitiesParam.split(',').map(f => f.trim());
      setSelectedFacilities(facilitiesArray);
    } else {
      setSelectedFacilities([]);
    }
  }, [params]);

  type HotelType = {
    HotelSearchCode: number;
    HotelName: string;
    HotelImage: string;
    CxlDeadLine: string;
    Rooms: string[];
    TotalPrice: string;
    HotelCode: number;
    Offers: {
      TotalPrice: number;
      Currency: string;
      Rooms: string[];
      Special?: string;
      Remark?: string;
      RoomBasis?: string;
      HotelSearchCode?: string;
    }[];
    RoomFacilities: string[];
    Location: string;
    hotelInfo: {
      address: string;
      description: string;
      facilities: string[];
      category: number;
      images: { url: string; description: string; }[];
      city_code: number;
      coordinates: { longitude: number; latitude: number };
      hotel_id: number;
      hotel_name: string;
    };
  };

  function FacilityList({ 
    facilities, 
    maxFacilities 
  }: { 
    facilities: string[]; 
    maxFacilities?: number;
  }) {
    const facilitiesToDisplay = maxFacilities 
      ? facilities.slice(0, maxFacilities)
      : facilities;

    return (
      <div className="flex flex-wrap gap-2">
        {facilitiesToDisplay.map((facility, index) => {
          const IconComponent = getFacilityIcon(facility);
          return (
            <div
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              <IconComponent className="h-3 w-3 flex-shrink-0" />
              <span className="whitespace-nowrap">{facility}</span>
            </div>
          );
        })}
      </div>
    );
  }

  // Filter hotels based on selected facilities
  useEffect(() => {
    if (results?.hotels) {
      if (selectedFacilities.length > 0) {
        const filtered = results.hotels.filter((hotel: HotelType) => {
          // Check if hotel has any of the selected facilities
          return selectedFacilities.some(facility => 
            hotel.hotelInfo?.facilities?.some((hotelFacility: string) => 
              hotelFacility.toLowerCase().includes(facility.toLowerCase())
            )
          );
        });
        setFilteredHotels(filtered);
      } else {
        // If no facilities selected, show all hotels
        setFilteredHotels(results.hotels);
      }
    } else {
      setFilteredHotels([]);
    }
  }, [results, selectedFacilities]);

  const StarRating = ({ rating }: { rating: number }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-[#FC5D01] text-[#FC5D01]" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {loading ? (
        <div className="flex items-center justify-center" style={{ height: "50vh" }}>
          <Image
            alt="Aforliyah preloader"
            width={100}
            height={100}
            src="/aforliyah_preloader.gif"
            className="object-contain"
          />
        </div>
      ) : (
        <div>
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-lg sm:text-xl">{results['hotels']?.length > 0 ? `${results["pagination"] && results["pagination"]['total']} hotels in ${destinationname}` : "No hotels found"}</h2>
              <Button
                variant="outline"
                className="gap-0 text-[#666666] border text-xs border-[#CCCCCC] bg-transparent w-fit"
              >
                <ArrowUpDown className="h-3 w-3 mr-1" />
                <span>Top picks</span>
              </Button>
            </div>

            {/* Hotel Cards */}
            <div className="space-y-4">
              {filteredHotels?.map((hotel: HotelType, index: number) => (
                <div
                  key={hotel.HotelCode}
                  className="bg-white hover:border hover:border-[#333333] flex flex-col border rounded-lg overflow-hidden">
                  <div className="flex flex-col lg:flex-row gap-0">
                    <div className="relative w-full lg:w-48 h-48 lg:h-60 flex-shrink-0">
                      <Image
                        src={hotel.HotelImage || "/placeholder.svg"}
                        alt={hotel.HotelName}
                        width={192}
                        height={240}
                        className="object-cover w-full h-full lg:rounded-l-lg"
                      />
                    </div>

                    {/* Hotel Info */}
                    <div className="flex-1 flex flex-col lg:flex-row justify-between">
                      <div className="flex justify-between flex-col gap-4 p-4 flex-1">
                        <div className="space-y-2">
                          {/* Category Badge */}
                          <StarRating rating={Number(hotel?.hotelInfo.category) || 0} />

                          {/* Hotel Name */}
                          <h3 className="text-lg lg:text-xl font-semibold">
                            {hotel.HotelName} <span></span>
                          </h3>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-[#808080]">
                            <Image
                              src={"/Location.svg"}
                              alt="Location"
                              width={16}
                              height={16}
                            />
                            <span className="text-sm">{hotel.hotelInfo.address}</span>
                          </div>
                          {/* Facilities */}
                          {hotel.hotelInfo?.facilities && (
                            <FacilityList facilities={hotel.hotelInfo.facilities} maxFacilities={5} />
                          )}
                        </div>

                        <div className="flex flex-wrap gap-4 lg:gap-4 items-center text-[#808080]">
                          <Button
                            variant="link"
                            className="p-0 h-auto text-xs tracking-widest text-orange-600"
                            onClick={() => handleHotelInfoClick([hotel.hotelInfo])}
                          >
                            Hotel Info
                          </Button>
                          <Button
                            onClick={() => handleShowRoomsClick(hotel.HotelCode)}
                            className="h-auto hover:bg-transparent bg-transparent border border-[#808080] text-[#808080] text-xs rounded p-2"
                          >
                            {showRoomsForHotel === hotel.HotelCode ? "Close " : "Show "}
                            rooms
                            {showRoomsForHotel === hotel.HotelCode ? (
                              <ChevronUp className="h-3 w-3 ml-2" />
                            ) : (
                              <ChevronDown className="h-3 w-3 ml-2" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-center flex flex-row lg:flex-col border-t lg:border-t-0 lg:border-l p-4 justify-between lg:justify-between lg:w-32">
                        <div className="flex flex-col gap-1">
                          <div className="text-xs text-[#808080]">Starting at</div>
                          <div className="text-sm lg:text-1xl font-medium text-[#0000FF]">
                            {hotel['Offers'][0]?.Currency}{Number(hotel['Offers'][0]?.TotalPrice).toFixed(2)}
                          </div>
                          <div className="text-xs text-[#808080]">Per night</div>
                        </div>
                        <div className="text-xs text-center text-[#808080] lg:mt-auto">
                          Includes
                          <br />
                          taxes & fees
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Rooms Section */}
                  <div
                    className={`w-full transition-all duration-500 ease-in-out overflow-hidden ${
                      showRoomsForHotel === hotel.HotelCode 
                        ? "opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    {hotel['Offers'] as unknown[] && (
                      <>
                        <div className="py-4">
                          <div className="space-y-3 w-full">
                            {hotel['Offers']?.map((room: any, index: number) => (
                              <div
                                key={index}
                                className='bg-white flex flex-col md:px-8 border-t p-4 lg:flex-row gap-4 transform transition-all duration-300 ease-out cursor-pointer translate-y-0 opacity-100'
                                style={{
                                  transitionDelay: `${index * 100}ms`
                                }}
                              >
                                <div className="flex flex-col lg:flex-row gap-4 w-full">
                                  <div className="relative w-full lg:w-48 h-48 flex-shrink-0">
                                    <Image
                                      src={"/placeholder.svg"}
                                      alt={"Hotel Image"}
                                      width={192}
                                      height={192}
                                      className="object-cover w-full h-full lg:rounded-lg"
                                    />
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col lg:flex-row justify-between">
                                    <div className="flex justify-between flex-col gap-4 py-1 px-4 flex-1">
                                      <div className="space-y-2">
                                        {/* UPDATED: Use formatted room display */}
                                        <h3 className="text-lg lg:text-xl font-semibold">
                                          {formatRoomDisplay(room.Rooms || [])}
                                        </h3>

                                        {hotel.RoomFacilities?.length > 0 && (
                                          <FacilityList facilities={hotel.RoomFacilities} maxFacilities={5} />
                                        )}
                                      </div>

                                      <div className="flex flex-wrap gap-2 lg:gap-4 items-center text-[#808080]">
                                        <Button
                                          variant="link"
                                          className="p-0 h-auto text-xs tracking-widest text-orange-600"
                                          onClick={() =>
                                            handleRoomInfoClick(room, hotel.RoomFacilities || [])
                                          }
                                        >
                                          Room Info
                                        </Button>
                                      </div>
                                    </div>

                                    <div className="text-center flex flex-row lg:flex-col border-t lg:border-t-0 p-4 justify-between lg:justify-between lg:w-32">
                                      <div className="flex flex-col gap-1">
                                        <div className="text-sm font-medium text-[#0000FF]">
                                          {room.Currency}{room.TotalPrice}
                                        </div>
                                        <div className="text-xs text-[#808080]">
                                          Per night
                                        </div>
                                      </div>
                                      <div className="lg:mt-2">
                                        <Button
                                          size={"sm"}
                                          className="bg-[#0000FF] w-[74px] p-2"
                                          onClick={() => handleBookClick(hotel, room)}
                                        >
                                          {isCurrentlyCached(hotel.HotelCode, room.HotelSearchCode) ? 'Booked' : 'Book'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}

                            <div className="p-4">
                              <Button
                                onClick={() => handleShowRoomsClick(hotel.HotelCode)}
                                className="w-full hover:bg-white border-2 bg-transparent text-[#888] border-[#ccc]"
                              >
                                Close Rooms <ChevronUp className="mr-2 h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {results['pagination'] && results['pagination']['total_pages'] > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
                <Button
                  onClick={() => {
                    if (results['pagination']['current_page'] > 1) {
                      const paramsObj = new URLSearchParams(params.toString());
                      paramsObj.set('page', String(results['pagination']['current_page'] - 1));
                      router.push(`?${paramsObj.toString()}`);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-transparent"
                  disabled={results['pagination']['current_page'] === 1}
                  style={{ cursor: 'pointer' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex gap-1 flex-wrap justify-center">
                  {[...Array(results['pagination']['total_pages'])].map((_, index) => (
                    <Button
                      key={index}
                      variant={results['pagination']['current_page'] === index + 1 ? "default" : "outline"}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => {
                        if (results['pagination']['current_page'] !== index + 1) {
                          const paramsObj = new URLSearchParams(params.toString());
                          paramsObj.set('page', String(index + 1));
                          router.push(`?${paramsObj.toString()}`);
                        }
                      }}
                      disabled={results['pagination']['current_page'] === index + 1}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>

                <Button
                  onClick={() => {
                    if (results['pagination']['current_page'] < results['pagination']['total_pages']) {
                      const paramsObj = new URLSearchParams(params.toString());
                      paramsObj.set('page', String(results['pagination']['current_page'] + 1));
                      router.push(`?${paramsObj.toString()}`);
                    }
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-1 bg-transparent"
                  disabled={results['pagination']['current_page'] === results['pagination']['total_pages']}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <HotelPoliciesDialog
            isOpen={isPoliciesDialogOpen}
            onClose={() => setIsPoliciesDialogOpen(false)}
            hotelName={selectedHotel}
          />
          <HotelInfoSheet
            isOpen={isHotelInfoSheetOpen}
            onClose={() => {
              setIsHotelInfoSheetOpen(false);
              setSelectedHotelForInfo([]);
            }}
            hotelinfo={selectedHotelForInfo}
          />

          <RoomInfoSheet
            isOpen={isRoomInfoSheetOpen}
            onClose={() => setIsRoomInfoSheetOpen(false)}
            roomData={selectedRoom}
            roomFeatures={selectedRoomFeatures}
          />
        </div>
      )}
    </>
  );
}

export default HotelResults;