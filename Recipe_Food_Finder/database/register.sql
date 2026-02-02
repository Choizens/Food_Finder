-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 18, 2024 at 04:03 PM
-- Server version: 10.4.25-MariaDB
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `register`
--

-- --------------------------------------------------------

--
-- Table structure for table `user_reg`
--

CREATE TABLE `user_reg` (
  `id` int(15) NOT NULL,
  `fname` varchar(20) NOT NULL,
  `middle` varchar(5) NOT NULL,
  `lname` varchar(20) NOT NULL,
  `exname` varchar(255) DEFAULT NULL,
  `idnum` varchar(12) NOT NULL,
  `username` varchar(30) NOT NULL,
  `emailadd` varchar(30) NOT NULL,
  `sex` varchar(20) NOT NULL,
  `date` date DEFAULT NULL,
  `age` int(150) NOT NULL,
  `password` varchar(255) NOT NULL,
  `purok` varchar(30) NOT NULL,
  `barangay` varchar(30) NOT NULL,
  `city` varchar(20) NOT NULL,
  `country` varchar(20) NOT NULL,
  `province` varchar(20) NOT NULL,
  `zipcode` int(4) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

--
-- Dumping data for table `user_reg`
--

INSERT INTO `user_reg` (`id`, `fname`, `middle`, `lname`, `exname`, `idnum`, `username`, `emailadd`, `sex`, `date`, `age`, `password`, `purok`, `barangay`, `city`, `country`, `province`, `zipcode`) VALUES
(154, 'Bea', '', 'Cedula', '', '2022-0482', 'bea', 'Christian@gmail.com', 'Male', '2003-10-21', 21, '$2y$10$3LwHZIAFVJhZiw7Q.UJUFuCkASZIlDYsr3yhZ.4A2GKhvrFCism1a', 'Bawdhawd', 'Adwaaw', 'Aawawd', 'Awadaw', 'Adawdaw', 1234),
(155, 'Cjawdhawj', 'Cjawd', 'Cjawdhawj', '', '2022-0321', 'wala', 'Christiandwaaw@gmail.com', 'Male', '2002-11-13', 22, '$2y$10$.9cKpTuf1iVQ7dHux..izuQ2na.jP1nMp0ldZYlheg7lkEJ6YCapC', 'Purok - 3', 'Bu', 'Cjjahwgahd', 'Aadwawd', 'Awadawd', 1234),
(156, 'Christian', 'Pas', 'Pas', 'XI', '2020-1234', 'chois', 'Christianawdawd@gmail.com', 'Male', '1998-07-16', 26, '$2y$10$2WwvkHvixcFzxxBDNX9I9eOm.boF0ZXsuC1V06x4tMYVxJhZErvb2', 'Purok - 9', 'Caloc - an', 'Cabadbaran City', 'Philippines', 'Agusan Del Norte', 1234),
(157, 'Christian', 'Gimen', 'Teofilo', 'Jr', '1234-1234', 'admin', 'Christianiry@gmail.com', 'Male', '2002-12-19', 21, '$2y$10$kaHAbpLZMVKGTYx1Y/MNtep9JoH0KOynvDKoL8yy3R2gegNzh/GGO', 'Purok - 9', 'Caloc - an', 'Cabadbaran', 'Philippines', 'Agusan Del Norte', 1234),
(158, 'Christian', 'Gemin', 'Teofilo', 'XI', '2022-0483', 'christian.123', 'Cjboy@gmail.com', 'Male', '2002-02-12', 22, '$2y$10$tPxia.jM4/Ph74wYFtvPCuYwGK/B/53WPTMIRx6WFpsdkbn7mCwzC', 'Purok - 9', 'Caloc - an', 'Cabadbaran', 'Philippines', 'Agusan Del Norte', 8061),
(159, 'Christian', 'Gemin', 'Teofilo', 'Jr', '2000-1234', 'friend', 'Christ@gmail.com', 'Male', '0000-00-00', 0, '$2y$10$WS0lFK4s2EbbTCsPN.SsO.a/loKY.jiTI20svk3SvDz7DO4irYUG.', 'Purok - 0', 'Caloc - an', 'Cabadbaran', 'Philippines', 'Agusan Del Norte', 1234),
(160, 'Christian', 'Gemin', 'Tofilo', 'Jr', '2022-1234', 'walawdaa', 'Christiaawdn@gmail.com', 'Male', '2002-02-12', 22, '$2y$10$wG6EDsNVhJlUO631FdnuG.6xRNP9.ITkQCzlDM6pyClf3OI/LR7Kq', 'Purok', 'Purok', 'Purok', 'Purok', 'Purok', 1234),
(161, 'Rose Ann', 'Ranar', 'Rayos', '', '2022-0807', 'roseann.ranatio', 'terio@gmail.com', 'Female', '2001-06-18', 23, '$2y$10$IbSOIXSrWyiwbur3kVRq0ueH.N.8S6.cwvXlJy7Fm.DELFIsnEG4O', 'Purok-5', 'Caloc-an', 'Cabadbaran City', 'Philippines', 'Agusan Del Norte', 2323),
(162, 'Christian', 'Gemin', 'Teofilo', 'Jr', '1234-1245', 'choiz', 'Christian123@gmail.com', 'Male', '2002-02-12', 22, '$2y$10$OZ3rqDV3HsfUvEUAJKaWnO6ezUznr.VQ91QDXLUQGingm/RELNVJK', 'Purok-9', 'Caloc-an', 'Cabadbaran', 'Philippines', 'Agusan Del Norte', 1234),
(163, 'Christian', 'Gemin', 'Teofilo', 'Jr', '1234-9999', 'knightcyberg', 'Knightcyberg@gmail.com', 'Male', '2023-12-19', 0, '$2y$10$fdf4i73rrhxUfxm6Zxyyp./3yDZdtYkApExkrcb/Z5fEQcs/VgSLq', 'Purok-9', 'Caloc-an', 'Cabadbaran', 'Philippines', 'Agusan Del Norte', 1234),
(164, 'Adwaadw', 'Adawd', 'Aawdawd', 'Jr', '1234-1200', 'adwawdas', 'asdawd@gmail.com', 'Male', '2002-12-04', 22, '$2y$10$0RfUByv1fduNQsTK2Q.pyOOlSO79KnS2Lr9QoBucvuYqL4mwOvycq', 'Adawdaw', 'Aadwawd', 'Aadwawd', 'Aadwadw', 'Adawawd', 2341),
(165, 'Aadwdaw', 'Aadwd', 'Aawddw', 'Jr', '9987-1234', 'aawdawddawdwa', 'Aawdawd@gmail.com', 'Male', '2024-12-11', 0, '$2y$10$SHbLrBHwhyAWorTEUqtzTe613TGtvESu1AqlOPbkZHlVehD2J/V2S', 'Aawdawd', 'Adawd', 'Aadwadw', 'Aadwddaw', 'Aadwdaw', 1234);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `user_reg`
--
ALTER TABLE `user_reg`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `user_reg`
--
ALTER TABLE `user_reg`
  MODIFY `id` int(15) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
