import IconMail from "@/assets/icons/IconMail.svg";
import IconGitHub from "@/assets/icons/IconGitHub.svg";
import IconBrandX from "@/assets/icons/IconBrandX.svg";
import IconWhatsapp from "@/assets/icons/IconWhatsapp.svg";
import IconFacebook from "@/assets/icons/IconFacebook.svg";
import IconTelegram from "@/assets/icons/IconTelegram.svg";
import IconPinterest from "@/assets/icons/IconPinterest.svg";

export const SOCIALS = [
  {
    name: "Github",
    href: "https://github.com/fython",
    linkTitle: "GitHub @fython",
    active: true,
    icon: IconGitHub,
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/siubeng/",
    linkTitle: "Instagram @siubeng",
    active: true,
    icon: IconPinterest,
  },
  {
    name: "Mail",
    href: "mailto:fythonx@gmail.com",
    linkTitle: "Send an email to me",
    active: true,
    icon: IconMail,
  },
  {
    name: "Twitter/X",
    href: "https://x.com/s1ubeng",
    linkTitle: "Twitter/X @s1ubeng",
    active: true,
    icon: IconBrandX,
  },
] as const;

export const SHARE_LINKS = [
  {
    name: "WhatsApp",
    href: "https://wa.me/?text=",
    linkTitle: `Share this post via WhatsApp`,
    icon: IconWhatsapp,
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/sharer.php?u=",
    linkTitle: `Share this post on Facebook`,
    icon: IconFacebook,
  },
  {
    name: "X",
    href: "https://x.com/intent/post?url=",
    linkTitle: `Share this post on X`,
    icon: IconBrandX,
  },
  {
    name: "Telegram",
    href: "https://t.me/share/url?url=",
    linkTitle: `Share this post via Telegram`,
    icon: IconTelegram,
  },
  {
    name: "Pinterest",
    href: "https://pinterest.com/pin/create/button/?url=",
    linkTitle: `Share this post on Pinterest`,
    icon: IconPinterest,
  },
  {
    name: "Mail",
    href: "mailto:?subject=See%20this%20post&body=",
    linkTitle: `Share this post via email`,
    icon: IconMail,
  },
] as const;
