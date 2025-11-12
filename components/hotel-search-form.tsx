"use client";

import type React from "react";
import { useState, useEffect, type FC, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ChevronDownIcon, Minus, Plus, Search, X, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import destinations from "./Destinations";
import { debounce } from "lodash";

interface Room {
  id: number;
  adults: number;
  children: number;
  childrenAges: number[];
}

interface CounterProps {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
}

interface FormData {
  destination: string;
  checkIn: Date;
  checkOut: Date;
  rooms: Room[];
  currency: string;
  nationality: string;
  destinationCode: string;
  totalRooms: number;
}

const Counter: FC<CounterProps> = ({
  label,
  value,
  onIncrement,
  onDecrement,
  min = 0,
}) => (
  <div>
    <label className="block text-[#808080] mb-1 text-sm">{label}</label>
    <div className="flex items-center gap-2 justify-center">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-gray-100 border-gray-300"
        onClick={onDecrement}
        disabled={value <= min}
      >
        <Minus className="h-3 w-3" />
      </Button>
      <span className="w-8 text-center text-sm font-medium">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 bg-gray-100 border-gray-300"
        onClick={onIncrement}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  </div>
);

type HotelSearchFormProps = {
  setLoading: (loading: boolean) => void;
  setResults: (results: any[]) => void;
};
const HotelSearchForm: React.FC<HotelSearchFormProps> = ({
  setLoading,
  setResults,
}) => {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    trigger,
  } = useForm<FormData>({
    defaultValues: {
      destination: params.get("destinationDisplay") || "",
      checkIn: params.get("checkIn")
        ? new Date(params.get("checkIn")!)
        : new Date(),
      checkOut: params.get("checkOut")
        ? new Date(params.get("checkOut")!)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
      rooms: [],
      currency: params.get("currency") || "USD",
      nationality: params.get("nationality") || "NG",
      destinationCode: params.get("destination") || "",
      totalRooms: params.get("totalRooms")
        ? Number.parseInt(params.get("totalRooms") || "1")
        : 1,
    },
  });

  const [rooms, setRooms] = useState<Room[]>([]);

  const [nights, setNights] = useState(0);
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: params.get("checkIn") ? new Date(params.get("checkIn")!) : new Date(),
    to: params.get("checkOut")
      ? new Date(params.get("checkOut")!)
      : new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  const [filteredDestinations, setFilteredDestinations] = useState<
    typeof destinations
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [AllHotels, setAllHotels] = useState<string[]>([]);

  const destinationValue = watch("destination") || params.get("destinationDisplay") || "";
  const checkInValue = watch("checkIn");
  const checkOutValue = watch("checkOut");
  const currencyValue = watch("currency");
  const nationalityValue = watch("nationality");

  // Use ref for setters to avoid dependency issues
  const settersRef = useRef({ setLoading, setResults });
  useEffect(() => {
    settersRef.current = { setLoading, setResults };
  }, [setLoading, setResults]);

  useEffect(() => {
    const totalRooms = Number.parseInt(params.get("totalRooms") || "1", 10);

    const parsedRooms: any[] = [];
    for (let i = 1; i <= totalRooms; i++) {
      const adults = Number.parseInt(params.get(`adult${i}`) || "1", 10);
      const children = Number.parseInt(params.get(`children${i}`) || "0", 10);
      const childrenAgesParam = params.get(`childrenAges${i}`);
      const childrenAges = childrenAgesParam
        ? childrenAgesParam.split(",").map((age) => Number.parseInt(age, 10))
        : [];
      parsedRooms.push({ id: i, adults, children, childrenAges });
    }

    setValue("rooms", parsedRooms);
    setRooms(parsedRooms);
  }, [params, setValue]);

  const fetchHotels = useCallback(() => {
    settersRef.current.setLoading(true);
    const formData = new URLSearchParams();

    formData.append("checkIn", params.get("checkIn") || "");
    formData.append("checkOut", params.get("checkOut") || "");
    formData.append("totalRooms", params.get("totalRooms") || "1");
    formData.append("currency", params.get("currency") || "USD");
    formData.append("nationality", params.get("nationality") || "NG");
    formData.append("destination", params.get("destination") || "");
    formData.append("page", params.get("page") || "1");
    formData.append("roomBasis", params.get("roomBasis") || "");
    formData.append("starLevels", params.get("starLevels") || "");
    formData.append("minPrice", params.get("minPrice") || "");
    formData.append("maxPrice", params.get("maxPrice") || "");

    for (let i = 1; i <= Number.parseInt(params.get("totalRooms") || "1"); i++ ) {
      formData.append(`adult${i}`, params.get(`adult${i}`) || "1");
      formData.append(`children${i}`, params.get(`children${i}`) || "0");
      formData.append(`childrenAges${i}`, params.get(`childrenAges${i}`) || "");
    }

    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/searchHotels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Fetched hotels:", data);
        settersRef.current.setResults(data);
        settersRef.current.setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching hotels:", error);
        settersRef.current.setLoading(false);
        settersRef.current.setResults([]);
      });
  }, [params]);

  // Fetch hotels when params change
  useEffect(() => {
    fetchHotels();
  }, [fetchHotels]);

  // Debounced search function
  const searchDestinations = debounce(async (query: string) => {
    if (!query?.trim()) {
      setFilteredDestinations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));

      const searchTerm = query.toLowerCase();
      const filtered = destinations.filter((dest) => {
        const isoCode = dest.IsoCode?.toLowerCase() || "";
        const city = dest.City?.toLowerCase() || "";
        const CityId =
          dest.CityId !== undefined && dest.CityId !== null
            ? String(dest.CityId)
            : "";
        const country = dest.Country?.toLowerCase() || "";

        return (
          isoCode.includes(searchTerm) ||
          city.includes(searchTerm) ||
          CityId.includes(searchTerm) ||
          country.includes(searchTerm)
        );
      });
      setFilteredDestinations(filtered.slice(0, 8));
    } catch (error) {
      console.error("Error searching destinations:", error);
      setFilteredDestinations([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);

  // Handle search input changes
  useEffect(() => {
    if (destinationValue) {
      searchDestinations(destinationValue);
    } else {
      setFilteredDestinations([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationValue]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate nights and sync with form when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      const timeDiff = dateRange.to.getTime() - dateRange.from.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      setNights(daysDiff > 0 ? daysDiff : 0);

      // Sync with form values
      setValue("checkIn", dateRange.from);
      setValue("checkOut", dateRange.to);
    } else if (dateRange?.from) {
      // If only from is selected, set checkIn
      setValue("checkIn", dateRange.from);
      setNights(0);
    }
  }, [dateRange, setValue]);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Select date";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Room management functions
  const addRoom = () => {
    if (rooms.length < 3) {
      const newRoom: Room = {
        id: Date.now(),
        adults: 1,
        children: 0,
        childrenAges: [],
      };
      const newRooms = [...rooms, newRoom];
      setRooms(newRooms);
      setValue("rooms", newRooms);
    }
  };

  const removeRoom = (roomId: number) => {
    if (rooms.length > 1) {
      const newRooms = rooms.filter((room) => room.id !== roomId);
      setRooms(newRooms);
      setValue("rooms", newRooms);
    }
  };

  const updateRoom = (roomId: number, field: keyof Room, value: any) => {
    setRooms((prevRooms) => {
      const updatedRooms = prevRooms.map((room) => {
        if (room.id === roomId) {
          if (field === "children") {
            const newChildren = Math.max(0, value);
            const currentChildren = room.children;

            if (newChildren > currentChildren) {
              const newAges = [
                ...room.childrenAges,
                ...Array(newChildren - currentChildren).fill(0),
              ];
              return { ...room, children: newChildren, childrenAges: newAges };
            } else if (newChildren < currentChildren) {
              const newAges = room.childrenAges.slice(0, newChildren);
              return { ...room, children: newChildren, childrenAges: newAges };
            }
          }

          if (field === "childrenAges") {
            return { ...room, childrenAges: value };
          }

          return { ...room, [field]: value };
        }
        return room;
      });

      setValue("rooms", updatedRooms);
      return updatedRooms;
    });
  };

  const updateChildAge = (roomId: number, childIndex: number, age: number) => {
    setRooms((prevRooms) => {
      const updatedRooms = prevRooms.map((room) => {
        if (room.id === roomId) {
          const newAges = [...room.childrenAges];
          newAges[childIndex] = age;
          return { ...room, childrenAges: newAges };
        }
        return room;
      });

      setValue("rooms", updatedRooms);
      return updatedRooms;
    });
  };

  const handleDestinationSelect = (destination: (typeof destinations)[0]) => {
    const displayValue = `${destination.City}, ${destination.Country}`;
    setValue("destination", displayValue, { shouldValidate: true });
    setValue("destinationCode", String(destination?.CityId), {
      shouldValidate: true,
    });
    setShowDropdown(false);
  };

  // Calculate total guests
  const totalGuests = rooms.reduce(
    (total, room) => total + room.adults + room.children,
    0
  );

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  ];

  const nationalities = [
    { name: "Nigeria", flag: "NG" },
    { name: "United States", flag: "US" },
    { name: "United Kingdom", flag: "GB" },
    { name: "Canada", flag: "CA" },
    { name: "Australia", flag: "AU" },
    { name: "Germany", flag: "DE" },
    { name: "France", flag: "FR" },
    { name: "Japan", flag: "JP" },
    { name: "South Africa", flag: "ZA" },
    { name: "India", flag: "IN" },
    { name: "Brazil", flag: "BR" },
    { name: "China", flag: "CN" },
  ];

  const onSubmit = (data: FormData) => {
    console.log("Form submitted:", data);

    const params = new URLSearchParams({
      destination: data.destinationCode,
      destinationDisplay: data.destination,
      checkIn: format(data.checkIn, "yyyy-MM-dd"),
      checkOut: format(data.checkOut, "yyyy-MM-dd"),
      //roomBasis: data.roomBasis.join(","),
      //starLevels: data.starLevels.join(","),
      //refundable: data.refundable.toString(),
      currency: data.currency,
      nationality: data.nationality,
      totalRooms: data.totalRooms.toString(),
    });

    // Add room-specific parameters
    data.rooms.forEach((room, index) => {
      const roomNumber = index + 1;

      params.append(`adult${roomNumber}`, room.adults.toString());
      params.append(`children${roomNumber}`, room.children.toString());

      if (room.children > 0 && room.childrenAges.length > 0) {
        params.append(`childrenAges${roomNumber}`, room.childrenAges.join(","));
      }
    });

    console.log("URL params:", params.toString());

    setIsExpanded(false);
    setIsDesktopExpanded(false);

    // Navigate to hotels page with query parameters
    router.push(`/hotels?${params.toString()}`);
    // Handle form submission - navigate to search results page
  };

  const renderCompactForm = () => (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div className="flex gap-4 w-full items-end">
        {/* City Search */}
        <div className="flex-1">
          <label className="block text-[#808080] mb-1 text-sm">
            Destination
          </label>
          <div className="relative w-full" ref={dropdownRef}>
            <Input
              {...register("destination", {
                required: "Destination is required",
                minLength: {
                  value: 2,
                  message: "Destination must be at least 2 characters",
                },
              })}
              className="pr-8 h-10 w-full"
              placeholder="Enter city or hotel name"
              onFocus={() => setShowDropdown(true)}
              autoComplete={undefined}
              onChange={(e) => {
                setValue("destination", e.target.value);
                if (e.target.value) {
                  setShowDropdown(true);
                }
              }}
            />
            <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-[#666666]" />

            {/* Enhanced Dropdown */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 overflow-hidden w-full">
                {isSearching ? (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2 w-full">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                    Searching destinations...
                  </div>
                ) : filteredDestinations.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto w-full">
                    {filteredDestinations.map((destination) => (
                      <div
                        key={destination.CityId}
                        className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 w-full"
                        onClick={() => handleDestinationSelect(destination)}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <div className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                            {destination.City !== null &&
                              destination?.City.toUpperCase()}{" "}
                            {destination?.Country.toUpperCase()} -{" "}
                            {destination?.IsoCode}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : destinationValue ? (
                  <div className="px-4 py-4 text-center text-gray-500 w-full">
                    <MapPin className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                    <p className="text-sm">No destinations found</p>
                    <p className="text-xs mt-1">Try different keywords</p>
                  </div>
                ) : (
                  <div className="px-4 py-4 text-center text-gray-500 w-full">
                    <Search className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                    <p className="text-sm">
                      Start typing to search destinations
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
          {errors.destination && (
            <p className="text-red-500 text-xs mt-1 w-full">
              {errors.destination.message}
            </p>
          )}
        </div>

        {/* Date Range Picker */}
        <div className="flex-1">
          <label className="block text-[#808080] mb-1 text-sm">Dates</label>
          <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal h-10 bg-transparent"
              >
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {formatDate(dateRange.from)} - {formatDate(dateRange.to)}
                    </>
                  ) : (
                    formatDate(dateRange.from)
                  )
                ) : (
                  "Select dates"
                )}
                <ChevronDownIcon className="ml-auto h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-auto p-0"
              align="start"
              side="bottom"
              sideOffset={4}
            >
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => {
                  setDateRange(range);
                  // Close popover when both dates are selected
                  if (range?.from && range?.to) {
                    setDateRangeOpen(false);
                  }
                }}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                initialFocus
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          {errors.checkIn && (
            <p className="text-red-500 text-xs mt-1 w-full">
              Dates are required
            </p>
          )}
        </div>

        {/* Guests & Rooms Summary */}
        <div className="flex-1">
          <label className="block text-[#808080] mb-1 text-sm">
            Guests & Rooms
          </label>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal h-10 bg-transparent"
            onClick={() => setIsDesktopExpanded(true)}
          >
            {totalGuests} guest{totalGuests !== 1 && "s"} • {rooms.length} room
            {rooms.length !== 1 && "s"}
            <ChevronDownIcon className="ml-auto h-4 w-4" />
          </Button>
        </div>

        {/* Search Button */}
        <Button
          type="submit"
          className="h-10 bg-blue-600 hover:bg-blue-700 px-6"
        >
          Search
        </Button>
      </div>
    </form>
  );

  const renderFullForm = (isMobile = false) => (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full">
      <div
        className={
          isMobile
            ? "flex flex-col gap-4 p-4 w-full"
            : "flex flex-col gap-6 w-full"
        }
      >
        {/* First Row: Search Input and Date Inputs */}
        <div
          className={`flex gap-4 ${isMobile ? "flex-col" : "flex-row"} w-full`}
        >
          {/* City Search with Dropdown */}
          <div className={`${isMobile ? "w-full" : "flex-1"} w-full`}>
            <label className="block text-[#808080] mb-1 text-sm">
              Destination
            </label>
            <div className="relative w-full" ref={dropdownRef}>
              <Input
                {...register("destination", {
                  required: "Destination is required",
                  minLength: {
                    value: 2,
                    message: "Destination must be at least 2 characters",
                  },
                })}
                className="pr-8 h-10 w-full"
                placeholder="Enter city or hotel name"
                onFocus={() => setShowDropdown(true)}
                autoComplete={undefined}
                onChange={(e) => {
                  setValue("destination", e.target.value);
                  if (e.target.value) {
                    setShowDropdown(true);
                  }
                }}
              />
              <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-[#666666]" />

              {/* Enhanced Dropdown */}
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 overflow-hidden w-full">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2 w-full">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      Searching destinations...
                    </div>
                  ) : filteredDestinations.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto w-full">
                      {filteredDestinations.map((destination) => (
                        <div
                          key={destination.CityId}
                          className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors duration-150 w-full"
                          onClick={() => handleDestinationSelect(destination)}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <div className="text-sm font-medium text-gray-900 flex-1 min-w-0">
                              {destination.City !== null &&
                                destination?.City.toUpperCase()}{" "}
                              {destination?.Country.toUpperCase()} -{" "}
                              {destination?.IsoCode}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : destinationValue ? (
                    <div className="px-4 py-4 text-center text-gray-500 w-full">
                      <MapPin className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                      <p className="text-sm">No destinations found</p>
                      <p className="text-xs mt-1">Try different keywords</p>
                    </div>
                  ) : (
                    <div className="px-4 py-4 text-center text-gray-500 w-full">
                      <Search className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                      <p className="text-sm">
                        Start typing to search destinations
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {errors.destination && (
              <p className="text-red-500 text-xs mt-1 w-full">
                {errors.destination.message}
              </p>
            )}
          </div>

          {/* Date Range Selection */}
          <div className={`${isMobile ? "w-full" : "flex-1"} w-full`}>
            <label className="block text-[#808080] mb-1 text-sm w-full">
              Check-in - Check-out
            </label>
            <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start text-left font-normal h-10 bg-transparent"
                >
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {formatDate(dateRange.from)} -{" "}
                        {formatDate(dateRange.to)}
                      </>
                    ) : (
                      formatDate(dateRange.from)
                    )
                  ) : (
                    "Select dates"
                  )}
                  <ChevronDownIcon className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range);
                    // Close popover when both dates are selected
                    if (range?.from && range?.to) {
                      setDateRangeOpen(false);
                    }
                  }}
                  disabled={(date) =>
                    date < new Date(new Date().setHours(0, 0, 0, 0))
                  }
                  initialFocus
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            {errors.checkIn && (
              <p className="text-red-500 text-xs mt-1 w-full">
                Dates are required
              </p>
            )}
          </div>
        </div>

        {/* Nights display */}
        {nights > 0 && (
          <div className="text-center w-full">
            <div className="text-[#808080] text-sm">
              {nights} Night{nights !== 1 ? "s" : ""}
            </div>
          </div>
        )}

        {/* Second Row: Dynamic Passengers */}
        <div className="flex flex-col w-full">
          <div className="flex items-center justify-between mb-2 w-full">
            <label className="block text-[#808080] text-sm">
              Rooms & Guests
            </label>
            {rooms.length < 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={addRoom}
                className="text-blue-600 hover:text-blue-700 text-xs"
              >
                + Add Room
              </Button>
            )}
          </div>

          <div className="space-y-3 w-full">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                className="border rounded-lg p-3 bg-gray-50 w-full"
              >
                <div className="flex items-center justify-between mb-3 w-full">
                  <h4 className="font-medium text-sm">Room {index + 1}</h4>
                  {rooms.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRoom(room.id)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                <div className="flex gap-4 w-full">
                  <div className="flex-1">
                    <Counter
                      label="Adults"
                      value={room.adults}
                      onIncrement={() =>
                        updateRoom(room.id, "adults", room.adults + 1)
                      }
                      onDecrement={() =>
                        updateRoom(
                          room.id,
                          "adults",
                          Math.max(1, room.adults - 1)
                        )
                      }
                      min={1}
                    />
                  </div>
                  <div className="flex-1">
                    <Counter
                      label="Children"
                      value={room.children}
                      onIncrement={() =>
                        updateRoom(room.id, "children", room.children + 1)
                      }
                      onDecrement={() =>
                        updateRoom(room.id, "children", room.children - 1)
                      }
                    />
                  </div>
                </div>

                {/* Children Ages */}
                {room.children > 0 && (
                  <div className="mt-3 space-y-2 w-full">
                    <label className="block text-[#808080] text-xs">
                      Children Ages
                    </label>
                    <div className="flex flex-wrap gap-2 w-full">
                      {room.childrenAges.map((age, childIndex) => (
                        <Select
                          key={childIndex}
                          value={age.toString()}
                          onValueChange={(value) =>
                            updateChildAge(
                              room.id,
                              childIndex,
                              Number.parseInt(value)
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs min-w-[100px] flex-1">
                            <SelectValue placeholder="Age" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 18 }, (_, i) => (
                              <SelectItem
                                key={i}
                                value={i.toString()}
                                className="text-xs"
                              >
                                {i} years
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {errors.rooms && (
            <p className="text-red-500 text-xs mt-1 w-full">
              Room configuration is required
            </p>
          )}
        </div>

        <input type="hidden" {...register("destinationCode")} />
        <input type="hidden" {...register("totalRooms")} />

        {/* Third Row: Currency and Submit Button */}
        <div
          className={`flex gap-4 ${
            isMobile ? "flex-col" : "flex-row justify-between items-end"
          } w-full`}
        >
          {/* Currency Selection */}
          <div className={isMobile ? "w-full" : "w-48"}>
            <label className="block text-[#808080] mb-1 text-sm">
              Currency
            </label>
            <Select
              value={currencyValue}
              onValueChange={(value) => setValue("currency", value)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((curr) => (
                  <SelectItem key={curr.code} value={curr.code}>
                    {curr.code} {curr.symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.currency && (
              <p className="text-red-500 text-xs mt-1">Currency is required</p>
            )}
          </div>

          <div className={isMobile ? "w-full" : "w-48"}>
            <label className="block text-[#808080] mb-1 text-sm">
              Nationality
            </label>
            <Select
              value={nationalityValue}
              onValueChange={(value) => setValue("nationality", value)}
            >
              <SelectTrigger className="h-10 w-full">
                <SelectValue placeholder="Nationality" />
              </SelectTrigger>
              <SelectContent>
                {nationalities.map((nationality) => (
                  <SelectItem key={nationality.name} value={nationality.flag}>
                    {nationality.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.nationality && (
              <p className="text-red-500 text-xs mt-1">
                Nationality is required
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className={`h-10 bg-blue-600 hover:bg-blue-700 ${
              isMobile ? "w-full mt-2" : "w-48"
            }`}
          >
            Search Hotels
          </Button>
        </div>
      </div>
    </form>
  );

  return (
    <>
      {/* Mobile View */}
      <div className="md:hidden w-full">
        <Button
          variant="outline"
          className="flex items-center justify-between bg-white rounded-3xl w-full h-12 px-4 text-left border-gray-300"
          onClick={() => setIsExpanded(true)}
        >
          <div className="flex items-center gap-3 w-full">
            <Search className="h-5 w-5 text-gray-600" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {destinationValue}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {dateRange?.from && dateRange?.to
                  ? `${formatDate(dateRange.from)} - ${formatDate(
                      dateRange.to
                    )}`
                  : "Select dates"}{" "}
                • {totalGuests} guest{totalGuests !== 1 && "s"} • {rooms.length}{" "}
                room{rooms.length !== 1 && "s"}
              </p>
            </div>
          </div>
        </Button>
      </div>

      {/* Desktop View - Collapsed by default */}
      <div className="hidden md:flex bg-white p-6 rounded-lg border border-gray-200 shadow-sm w-full">
        {!isDesktopExpanded ? (
          renderCompactForm()
        ) : (
          <div className="w-full">
            <div className="flex items-center justify-between mb-6 w-full">
              <h2 className="text-lg font-semibold">Edit your search</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDesktopExpanded(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            {renderFullForm(false)}
          </div>
        )}
      </div>

      {/* Mobile Expanded View */}
      {isExpanded && (
        <div className="fixed inset-0 bg-white z-50 md:hidden overflow-y-auto w-full">
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white w-full">
            <h2 className="text-lg font-semibold">Edit your search</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="w-full">{renderFullForm(true)}</div>
        </div>
      )}
    </>
  );
};

export default HotelSearchForm;
