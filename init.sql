/*===============================
    DATABASE CREATION
  ===============================*/

CREATE DATABASE IF NOT EXISTS DISNUTZTEST01;
USE DISNUTZTEST01;
CREATE TABLE User (
    userId INT AUTO_INCREMENT PRIMARY KEY,
    firstName varchar(50) NOT NULL,
    lastName varchar(50) NOT NULL,
    userStatus Boolean DEFAULT TRUE,
    email varchar(100) NOT NULL,
    area varchar(10) NOT NULL,
    fk_role INT NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Item (
    itemId INT AUTO_INCREMENT PRIMARY KEY NOT NULL,
    itemName varchar(30) NOT NULL,
    itemDescription varchar(255) NOT NULL,
    manufacter varchar(25),
    codeBar varchar(25),
    category ENUM("No Category") DEFAULT "No Category",
    fk_user_responsible INT NOT NULL,
    fk_place INT NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE Report (
    reportId INT AUTO_INCREMENT PRIMARY KEY,
    reportName varchar(50) NOT NULL,
    reportDescription varchar(255) NOT NULL,
    reportStatus int DEFAULT 1,
    reportPriority int DEFAULT 3,
    dueDate Date,
    fk_user INT NOT NULL,
    fk_item INT NOT NULL,
    fk_place INT NOT NULL,  
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE History (
    historyId INT AUTO_INCREMENT PRIMARY KEY,
    fk_user INT NOT NULL,
    fk_item INT NOT NULL,
    fk_place INT NOT NULL,
    fk_report INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Place (
    placeId INT AUTO_INCREMENT PRIMARY KEY,
    placeName varchar(50) NOT NULL,
    placeDescription varchar(255) NOT NULL,
    class varchar(255) NOT NULL,
    ip_range varchar(255) NOT NULL,
    placeLocation varchar(255) NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Permission (
    permissionId INT AUTO_INCREMENT PRIMARY KEY,
    permissionName varchar(50) NOT NULL,
    permissionDescription varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE UserRole (
    roleId INT AUTO_INCREMENT PRIMARY KEY,
    roleName varchar(50) NOT NULL,
    roleDescription varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE Request (
    requestId INT AUTO_INCREMENT PRIMARY KEY,
    requestName varchar(20),
    requestDescription varchar(255),
    requestStatus INT DEFAULT 1,
    fk_user_reciver INT NOT NULL,
    fk_user_requester INT NOT NULL,
    fk_item INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE UserNotification (
    notificationId INT AUTO_INCREMENT PRIMARY KEY,
    requestDescription varchar(255),
    notificationType ENUM("Request","Report","item") DEFAULT "item",
    fk_trigger INT NOT NULL,
    fk_user_trigger INT NOT NULL,
    fk_notified INT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

/*===============================
    FOREIGN KEY ASSIGNATION
  ===============================*/

ALTER TABLE User
    ADD CONSTRAINT fk_user_role 
        FOREIGN KEY (fk_role)
        REFERENCES  UserRole(roleId)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
ALTER TABLE Item
    ADD CONSTRAINT fk_item_user
        FOREIGN KEY (fk_user_responsible)
        REFERENCES User(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    ADD CONSTRAINT fk_item_place
        FOREIGN KEY (fk_place)
        REFERENCES Place(placeId)
        ON DELETE CASCADE
        ON UPDATE CASCADE;
ALTER TABLE History
    ADD CONSTRAINT fk_history_user 
        FOREIGN KEY (fk_user) 
        REFERENCES User(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 

    ADD CONSTRAINT fk_history_item
        FOREIGN KEY (fk_item) 
        REFERENCES Item(itemId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 

    ADD CONSTRAINT fk_history_place 
        FOREIGN KEY (fk_place) 
        REFERENCES Place(placeId)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    ADD CONSTRAINT fk_history_report
        FOREIGN KEY (fk_report) 
        REFERENCES Report(reportId)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE Request
    ADD CONSTRAINT fk_request_user
        FOREIGN KEY (fk_user_reciver) 
        REFERENCES User(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 
    ADD CONSTRAINT fk_requester_user 
        FOREIGN KEY (fk_user_requester) 
        REFERENCES User(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 
    ADD CONSTRAINT fk_request_item
        FOREIGN KEY (fk_item) 
        REFERENCES Item(itemId)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

ALTER TABLE Report
    ADD CONSTRAINT fk_report_user 
        FOREIGN KEY (fk_user) 
        REFERENCES User(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 
    ADD CONSTRAINT fk_report_place 
        FOREIGN KEY (fk_place) 
        REFERENCES Place(placeId)
        ON DELETE CASCADE
        ON UPDATE CASCADE, 
    ADD CONSTRAINT fk_report_item
        FOREIGN KEY (fk_item) 
        REFERENCES Item(itemId)
        ON DELETE CASCADE
        ON UPDATE CASCADE;

/*===============================
    INSERT INITIAL VALUES
  ===============================*/

INSERT INTO UserRole(roleName,roleDescription)
VALUES ("Admin","CAN DO EVERYTHING");
INSERT INTO User(firstName, lastName, userStatus, email, area, fk_role)
VALUES ("TEST USER", " 01", TRUE, "st1234@utr.edu.mx","IDGS",1);

INSERT INTO Place(placeName, placeDescription, class, ip_range, placeLocation)
VALUES ("A101", "Le falta un pito"," Salon Normal", "172.0.0.1-172.0.240","A Building");