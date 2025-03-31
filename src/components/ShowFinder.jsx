import React, { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css"; 
import "slick-carousel/slick/slick-theme.css";
import { motion } from "framer-motion";
import { Search, TrendingUp as TrendingUpIcon } from "lucide-react";
import EventCard from "./EventCard";
import { connectWallet, getContractInstance, getAllEventIds } from "../blockchain";
import { ethers } from "ethers";

function parseMetadata(metadataURI) {
  try {
    const url = new URL(metadataURI);
    return {
      title: url.searchParams.get("title") || "No Title",
      desc: url.searchParams.get("desc") || "No Description",
      date: url.searchParams.get("date") || "N/A",
      location: url.searchParams.get("location") || "N/A",
      image: url.searchParams.get("image") || "",
      eventType: url.searchParams.get("eventType") || ""
    };
  } catch (error) {
    return {
      title: "No Title",
      desc: "No Description",
      date: "N/A",
      location: "N/A",
      image: "",
      eventType: ""
    };
  }
}

function ShowFinder() {
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [onChainEvents, setOnChainEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreRef = useRef(null);

  // New state to keep track of selected category filters
  const [selectedCategories, setSelectedCategories] = useState([]);

  // Set initial filter if passed from Home
  useEffect(() => {
    if (location.state && location.state.filter) {
      setSelectedCategories([location.state.filter]);
    }
  }, [location.state]);

  // Fetch on-chain events on mount
  useEffect(() => {
    async function fetchEvents() {
      setLoadingEvents(true);
      try {
        const signer = await connectWallet();
        const contract = getContractInstance(signer);
        const ids = await getAllEventIds(signer);
        const eventsArr = await Promise.all(
          ids.map(async (id) => {
            const ev = await contract.events(id);
            return {
              id: id.toString(),
              creator: ev.creator,
              ticketPrice: ev.ticketPrice.toString(),
              metadataURI: ev.metadataURI,
              maxTickets: ev.maxTickets.toString(),
              ticketsSold: ev.ticketsSold.toString(),
            };
          })
        );
        setOnChainEvents(eventsArr);
      } catch (error) {
        console.error("Error fetching on-chain events:", error);
      }
      setLoadingEvents(false);
    }
    fetchEvents();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    setVisibleCount(6);
  }, [query, selectedCategories]);

  const searchqueryfunc = (e) => {
    setQuery(e.target.value);
  };

  // Filter events based on metadataURI search
  let filteredEvents = onChainEvents.filter(event =>
    event.metadataURI.toLowerCase().includes(query.toLowerCase())
  );

  // Further filter events by eventType if any categories are selected
  if (selectedCategories.length > 0) {
    filteredEvents = filteredEvents.filter(event => {
      const meta = parseMetadata(event.metadataURI);
      return selectedCategories.map(cat => cat.toLowerCase()).includes(meta.eventType.toLowerCase());
    });
  }

  const currentEvents = filteredEvents.slice(0, visibleCount);

  // Compute latest events (last 6 events, newest first)
  const latestEvents = onChainEvents.length > 0
    ? [...onChainEvents].slice(-5).reverse()
    : [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleCount < filteredEvents.length) {
          setVisibleCount(prev => prev + 5);
        }
      },
      { threshold: 0.1 }
    );
    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => {
      if (loadMoreRef.current) {
        observer.unobserve(loadMoreRef.current);
      }
    };
  }, [loadMoreRef, filteredEvents, visibleCount]);

  // Carousel settings for slider
  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    centerMode: false,
    centerPadding: '0px',
    arrows: true,
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
          centerMode: false,
          arrows: false,
        },
      },
    ],
  };

  // Category button click handler to toggle filters
  const toggleCategory = (category) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  // Utility to check if a category is selected
  const isCategorySelected = (category) => selectedCategories.includes(category);

  return (
    <div className="bg-black/90 pt-[100px]">
      <style>{`
        .slick-dots li button:before {
          font-size: 12px;
          color: #ffffff;
        }
        .slick-dots li.slick-active button:before {
          color: #ffa500;
        }
        .custom-card {
          width: 500px;
        }
      `}</style>

      <h1 className="text-white text-4xl font-bold drop-shadow-lg ml-20 pt-4 pb-4">
        <span className="flex items-center gap-2">
          Now Trending
          <TrendingUpIcon className="w-8 h-8" />
        </span>
      </h1>

      <div className="w-full px-8 pb-16 pt-8">
        <Slider {...sliderSettings}>
          {latestEvents.map((event) => {
            const metadata = parseMetadata(event.metadataURI);
            return (
              <div className="px-2 custom-card" key={event.id}>
                <Link to="/tickets" state={{ event }}>
                  <div className="relative overflow-visible transform origin-center transition duration-300 ease-in-out hover:scale-[1.02] hover:shadow-2xl">
                    <img
                      src={metadata.image || "fallback.jpg"}
                      alt={metadata.title}
                      className="w-full h-[300px] object-cover rounded-lg shadow-lg filter brightness-75 hover:brightness-100"
                    />
                    <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black to-transparent rounded-b-lg">
                      <span className="text-white text-lg font-bold">{metadata.title}</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </Slider>
      </div>

      {/* Search & Category Buttons */}
      <div className="flex flex-col items-center gap-4 px-2 mt-2 w-full justify-center pt-4">
        <div className="flex gap-4">
          <button
            onClick={() => toggleCategory("Movie")}
            className={`bg-[#103628] text-[16px] px-4 py-2 rounded-3xl transition-transform ${
              isCategorySelected("Movie")
                ? "text-black bg-gray-500 scale-105"
                : "text-gray-400 bg-opacity-60 hover:scale-105 hover:bg-gray-500 hover:text-black"
            }`}
          >
            Movies
          </button>
          <button
            onClick={() => toggleCategory("Concert")}
            className={`bg-[#103628] text-[16px] px-4 py-2 rounded-3xl transition-transform ${
              isCategorySelected("Concert")
                ? "text-black bg-gray-500 scale-105"
                : "text-gray-400 bg-opacity-60 hover:scale-105 hover:bg-gray-500 hover:text-black"
            }`}
          >
            Concerts
          </button>
          <button
            onClick={() => toggleCategory("Sport")}
            className={`bg-[#103628] text-[16px] px-4 py-2 rounded-3xl transition-transform ${
              isCategorySelected("Sport")
                ? "text-black bg-gray-500 scale-105"
                : "text-gray-400 bg-opacity-60 hover:scale-105 hover:bg-gray-500 hover:text-black"
            }`}
          >
            Sports
          </button>
        </div>
        <motion.div
          initial={{ width: 40 }}
          animate={{ width: isSearchOpen ? 300 : 40 }}
          transition={{ duration: 0.3 }}
          style={{ height: 40, transformOrigin: 'right center' }}
          className="flex items-center bg-[#103628] bg-opacity-60 rounded-full overflow-hidden"
        >
          {isSearchOpen && (
            <input
              type="text"
              placeholder="Search for events..."
              className="flex-1 px-4 py-2 text-gray-200 bg-transparent focus:outline-none"
              value={query}
              onChange={searchqueryfunc}
            />
          )}
          <button
            type="button"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="flex items-center justify-center w-10 h-10 hover:scale-105 text-gray-400 hover:bg-gray-500 hover:text-black focus:outline-1 outline-slate-300 transition-transform"
          >
            <Search size={20} color="currentColor" />
          </button>
        </motion.div>
      </div>

      {/* On-Chain Events Listing */}
      <div className="cards-container">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto pb-8 mt-8 px-4">
          {loadingEvents ? (
            <p className="text-white text-center">Loading events...</p>
          ) : (
            currentEvents.map((event, index) => {
              const metadata = parseMetadata(event.metadataURI);
              const { title, date, location, image, eventType } = metadata;
              return (
                <Link key={index} to="/tickets" state={{ event }}>
                  <EventCard
                    title={title || "Untitled Event"}
                    image={image || "fallback.jpg"}
                    date={date || "N/A"}
                    location={location || "N/A"}
                    price={ethers.formatEther(event.ticketPrice)}
                    eventType={eventType}
                  />
                </Link>
              );
            })
          )}
        </div>
        <div ref={loadMoreRef} className="h-10"></div>
      </div>
    </div>
  );
}

export default ShowFinder;
