"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./page.module.css";
import {
	Clock,
	Mail,
	Phone,
	Users,
	Calendar,
	ChevronLeft,
	ChevronRight,
	MessageSquare,
	CheckCircle,
	Building,
	Briefcase,
} from "lucide-react";

export default function Customers() {
	const [countdown, setCountdown] = useState(30);
	const [subscribed, setSubscribed] = useState(false);
	const [email, setEmail] = useState("");

	// Countdown timer
	useEffect(() => {
		if (countdown > 0) {
			const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [countdown]);

	const handleSubscribe = (e: React.FormEvent) => {
		e.preventDefault();
		if (email) {
			// Simulate API call
			setTimeout(() => {
				setSubscribed(true);
				setEmail("");
				// Reset after 5 seconds
				setTimeout(() => setSubscribed(false), 5000);
			}, 1000);
		}
	};

	const features = [
		{
			icon: <Users size={24} />,
			title: "مدیریت هوشمند مشتریان",
			description: "سیستم جامع مدیریت اطلاعات و تعاملات مشتریان",
		},
		{
			icon: <Briefcase size={24} />,
			title: "پیگیری پروژه‌ها",
			description: "پیگیری وضعیت پروژه‌های هر مشتری به صورت لحظه‌ای",
		},
		{
			icon: <MessageSquare size={24} />,
			title: "پشتیبانی اختصاصی",
			description: "سیستم تیکتینگ و پشتیبانی ویژه برای هر مشتری",
		},
		{
			icon: <Calendar size={24} />,
			title: "برنامه‌ریزی جلسات",
			description: "مدیریت جلسات و قرارهای ملاقات با مشتریان",
		},
	];

	const testimonials = [
		{
			name: "محمد رضایی",
			role: "مدیر پروژه، شرکت سازه‌گستر",
			text: "منتظر راه‌اندازی این بخش هستم تا مدیریت ارتباط با مشتریانم را متحول کنم.",
		},
		{
			name: "فاطمه محمدی",
			role: "مدیر فروش، آبادگران",
			text: "سیستم فعلی ما نیاز به بروزرسانی دارد و این صفحه امیدوارکننده به نظر می‌رسد.",
		},
	];

	return (
		<div className={styles.container}>
			{/* Background with gradient */}
			<div className={styles.background}>
				<div className={styles.gradientOverlay}></div>
				<div className={styles.pattern}></div>
			</div>

			{/* Main Content */}
			<main className={styles.main}>
				<div className={styles.content}>
					{/* Header */}
					<header className={styles.header}>
						<div className={styles.logoSection}>
							<Building
								size={32}
								className={styles.logoIcon}
							/>
							<h1 className={styles.logoText}>سیستم مدیریت ساخت و ساز</h1>
						</div>

						<div className={styles.countdown}>
							<Clock size={20} />
							<span>راه‌اندازی در: </span>
							<span className={styles.countdownNumber}>{countdown}</span>
							<span> روز</span>
						</div>
					</header>

					{/* Hero Section */}
					<section className={styles.hero}>
						<div className={styles.heroContent}>
							<div className={styles.badge}>
								<span>به زودی</span>
							</div>

							<h1 className={styles.title}>
								<span className={styles.titleHighlight}>مدیریت مشتریان</span>
								<br />
								تجربه جدید ارتباط با مشتری
							</h1>

							<p className={styles.subtitle}>
								در حال توسعه سیستم جامع مدیریت مشتریان با قابلیت‌های پیشرفته
								برای بهبود تجربه مشتری و افزایش رضایت در پروژه‌های ساخت و ساز
							</p>

							{/* Subscribe Form */}
							<div className={styles.subscribeSection}>
								<h3 className={styles.subscribeTitle}>
									از راه‌اندازی زودهنگام مطلع شوید
								</h3>

								{subscribed ? (
									<div className={styles.successMessage}>
										<CheckCircle size={24} />
										<span>اشتراک شما با موفقیت ثبت شد!</span>
										<p className={styles.successSubText}>
											به محض راه‌اندازی، اطلاع‌رسانی خواهیم کرد.
										</p>
									</div>
								) : (
									<form
										onSubmit={handleSubscribe}
										className={styles.subscribeForm}
									>
										<div className={styles.inputGroup}>
											<Mail
												size={20}
												className={styles.inputIcon}
											/>
											<input
												type='email'
												placeholder='ایمیل خود را وارد کنید'
												className={styles.emailInput}
												value={email}
												onChange={(e) => setEmail(e.target.value)}
												required
											/>
											<button
												type='submit'
												className={styles.subscribeButton}
											>
												اطلاع‌رسانی شوید
											</button>
										</div>
										<p className={styles.formHint}>
											اطلاعات شما محرمانه می‌ماند و فقط برای اطلاع‌رسانی استفاده
											می‌شود
										</p>
									</form>
								)}
							</div>
						</div>

						{/* Illustration */}
						<div className={styles.illustration}>
							<div className={styles.illustrationImage}>
								<Users
									size={120}
									className={styles.mainIcon}
								/>
							</div>
							<div className={styles.floatingElements}>
								<div
									className={styles.floatingElement}
									style={{ animationDelay: "0s" }}
								>
									<MessageSquare size={24} />
								</div>
								<div
									className={styles.floatingElement}
									style={{ animationDelay: "0.5s" }}
								>
									<Calendar size={24} />
								</div>
								<div
									className={styles.floatingElement}
									style={{ animationDelay: "1s" }}
								>
									<Briefcase size={24} />
								</div>
							</div>
						</div>
					</section>

					{/* Features */}
					<section className={styles.features}>
						<h2 className={styles.sectionTitle}>قابلیت‌های اصلی</h2>
						<p className={styles.sectionSubtitle}>
							امکاناتی که در بخش مدیریت مشتریان ارائه خواهیم داد
						</p>

						<div className={styles.featuresGrid}>
							{features.map((feature, index) => (
								<div
									key={index}
									className={styles.featureCard}
								>
									<div className={styles.featureIcon}>{feature.icon}</div>
									<h3 className={styles.featureTitle}>{feature.title}</h3>
									<p className={styles.featureDescription}>
										{feature.description}
									</p>
								</div>
							))}
						</div>
					</section>

					{/* Testimonials */}
					<section className={styles.testimonials}>
						<h2 className={styles.sectionTitle}>نظرات همکاران</h2>
						<p className={styles.sectionSubtitle}>
							آنچه دیگر مدیران پروژه درباره این بخش می‌گویند
						</p>

						<div className={styles.testimonialsSlider}>
							<button className={styles.sliderButton}>
								<ChevronRight size={24} />
							</button>

							<div className={styles.testimonialsContent}>
								{testimonials.map((testimonial, index) => (
									<div
										key={index}
										className={styles.testimonialCard}
									>
										<div className={styles.testimonialHeader}>
											<div className={styles.avatar}>
												<Users size={20} />
											</div>
											<div className={styles.testimonialInfo}>
												<h4 className={styles.testimonialName}>
													{testimonial.name}
												</h4>
												<p className={styles.testimonialRole}>
													{testimonial.role}
												</p>
											</div>
										</div>
										<p className={styles.testimonialText}>{testimonial.text}</p>
									</div>
								))}
							</div>

							<button className={styles.sliderButton}>
								<ChevronLeft size={24} />
							</button>
						</div>
					</section>

					{/* Contact Info */}
					<footer className={styles.footer}>
						<div className={styles.contactInfo}>
							<div className={styles.contactItem}>
								<Phone size={20} />
								<span>۰۲۱-۱۲۳۴۵۶۷۸</span>
							</div>
							<div className={styles.contactItem}>
								<Mail size={20} />
								<span>support@construction-management.ir</span>
							</div>
						</div>
						<p className={styles.copyright}>
							© {new Date().getFullYear()} سیستم مدیریت پروژه ساخت و ساز. تمامی
							حقوق محفوظ است.
						</p>
					</footer>
				</div>
			</main>
		</div>
	);
}
