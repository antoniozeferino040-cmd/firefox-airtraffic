const CONTAINER_COLORS = {
  blue: "#37adff", turquoise: "#00c79a", green: "#51cd00",
  yellow: "#ffcb00", orange: "#ff9f00", red: "#ff613d",
  pink: "#ff4bda", purple: "#af51f5", toolbar: "#7c7c7d",
};

const CONTAINER_ICONS = {
  fingerprint: "\uD83D\uDD90\uFE0F",
  briefcase: "\uD83D\uDCBC",
  dollar: "\uD83D\uDCB2",
  cart: "\uD83D\uDED2",
  circle: "\u2B55",
  gift: "\uD83C\uDF81",
  vacation: "\u2708\uFE0F",
  food: "\uD83C\uDF54",
  fruit: "\uD83C\uDF4E",
  pet: "\uD83D\uDC3E",
  tree: "\uD83C\uDF33",
  chill: "\u2744\uFE0F",
  fence: "\uD83C\uDF1F",
};

const MATCH_TYPE_CONFIG = {
  domain:         { placeholder: "github.com",              hint: "Matches github.com and all subdomains",    label: "Domain" },
  domainContains: { placeholder: "google",                  hint: "Matches any domain containing \"google\"", label: "Domain contains" },
  contains:       { placeholder: "buser",                   hint: "Matches any URL containing this text",     label: "URL contains" },
  wildcard:       { placeholder: "*.github.com/avelino/*",  hint: "Use * as wildcard for any characters",     label: "Wildcard" },
  regex:          { placeholder: "^https://(www\\.)?g.*",   hint: "Regular expression (advanced)",            label: "Regex" },
};
