const Listing = require("../models/listing.js");
const axios = require("axios");
const filters = require("../utils/filters");
async function geocodeLocation(location, country) {
  if (!location || location.trim() === "") {
    throw new Error("Location is required");
  }

  // Build query dynamically
  const queryParts = [location, country].filter(Boolean);
  const query = queryParts.join(", ");

  try {
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          limit: 1,
        },
        headers: {
          "User-Agent": "wanderlust-project (educational)",
        },
        timeout: 5000,
      },
    );

    if (!response.data || response.data.length === 0) {
      console.log("❌ No results for:", query);
      throw new Error("Location not found");
    }

    const { lon, lat, display_name } = response.data[0];

    console.log("📍 Found:", display_name);

    return [parseFloat(lon), parseFloat(lat)];
  } catch (err) {
    console.error("🌍 Geocoding error:", err.message);
    throw new Error("Unable to trace coordinates");
  }
}

module.exports.index = async (req, res) => {
  try {
    const { filter, q } = req.query; // read query params
    let query = {};

    // Filter by category
    if (filter && filter.trim() !== "") {
      query.category = filter; // category field in DB
    }

    // Optional search by title or location
    if (q && q.trim() !== "") {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } },
      ];
    }

    const allListings = await Listing.find(query);

    res.render("listings/index", {
      allListings,
      filters,
      selectedFilter: filter || "",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Something went wrong!");
    res.redirect("/listings");
  }
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new", { filters }); // ✅ SEND FILTERS
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({
      path: "reviews",
      populate: {
        path: "author",
      },
    })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you requested for does not exist");
    return res.redirect("/listings");
  }
  console.log(listing);
  res.render("listings/show", { listing });
};

module.exports.createListing = async (req, res) => {
  try {
    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = { url, filename };

    const coords = await geocodeLocation(
      req.body.listing.location,
      req.body.listing.country,
    );

    newListing.geometry = {
      type: "Point",
      coordinates: coords,
    };

    await newListing.save();
    req.flash("success", "New listing created!");
    res.redirect("/listings");
  } catch (err) {
    console.error(err.message);
    req.flash(
      "error",
      "Unable to trace coordinates for this location. Please enter a more specific location.",
    );
    res.redirect("/listings/new");
  }
};

module.exports.renderEditForm = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  if (!listing) {
    req.flash("error", "Listing you requested for does not exist");
    return res.redirect("/listings");
  }

  let originalImageUrl = listing.image.url.replace("/upload", "/upload/w_250");

  res.render("listings/edit", {
    listing,
    originalImageUrl,
    filters, // ✅ SEND FILTERS
  });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);

  const oldLocation = listing.location;
  const oldCountry = listing.country;

  // Update fields
  listing.title = req.body.listing.title;
  listing.description = req.body.listing.description;
  listing.location = req.body.listing.location;
  listing.country = req.body.listing.country;
  listing.price = req.body.listing.price;
  listing.category = req.body.listing.category;

  // ✅ ONLY re-geocode if location actually changed
  if (
    oldLocation !== req.body.listing.location ||
    oldCountry !== req.body.listing.country
  ) {
    const coords = await geocodeLocation(
      req.body.listing.location,
      req.body.listing.country,
    );

    listing.geometry = {
      type: "Point",
      coordinates: coords,
    };

    console.log("📍 Location changed → new coords:", coords);
  } else {
    console.log("📌 Location unchanged → keeping old coords");
  }

  // Update image
  if (req.file) {
    listing.image = { url: req.file.path, filename: req.file.filename };
  }

  await listing.save();
  req.flash("success", "Listing updated!");
  res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  req.flash("success", "Listing deleted!");
  return res.redirect("/listings");
};
