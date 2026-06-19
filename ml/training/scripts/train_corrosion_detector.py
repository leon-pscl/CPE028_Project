"""
Corrosion Detection Model Training
===================================

Multi-class classification model to detect corrosion levels in devices.
Uses DATA_SET_FOR_RELEASE folder with cross-validation splits.

Dataset structure:
  DATA_SET_FOR_RELEASE/renamed/
    cross_val_1/
      train/
        5/  (corrosion level 5 - low)
        6/  (corrosion level 6)
        7/  (corrosion level 7)
        8/  (corrosion level 8)
        9/  (corrosion level 9 - high)
      val/
        5/
        6/
        7/
        8/
        9/
    test/
      5/
      6/
      7/
      8/
      9/
"""

import sys
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader
from torchvision import models, transforms, datasets
from pathlib import Path
import json
from tqdm import tqdm
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import os

sys.path.insert(0, str(Path(__file__).resolve().parent))
from visualize import plot_confusion_matrix, plot_training_curves, plot_roc_auc, plot_per_class_pr

# ============ CONFIGURATION ============

DATASET_ROOT = Path(__file__).resolve().parent.parent / "datasets" / "image" / "DATA_SET_FOR_RELEASE_CORROSION" / "DATA_SET_FOR_RELEASE" / "renamed"
MODEL_OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "models" / "corrosion_detector.pth"
RESULTS_DIR = Path(__file__).resolve().parent.parent / "results"
RESULTS_DIR.mkdir(exist_ok=True)

# Classes for multi-class corrosion level classification
CLASSES = ["5", "6", "7", "8", "9"]  # Corrosion levels
NUM_CLASSES = len(CLASSES)

# Image preprocessing
IMG_SIZE = 224
BATCH_SIZE = 32
NUM_EPOCHS = 20
LEARNING_RATE = 0.001
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Use first cross-validation split for training
CV_SPLIT = "cross_val_1"

# ============ DATA TRANSFORMS ============

train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ColorJitter(brightness=0.2, contrast=0.2),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])

# ============ MODEL ARCHITECTURE ============

class CorrosionDetector(nn.Module):
    """ResNet18-based multi-class classifier for corrosion levels"""
    
    def __init__(self, num_classes=5, pretrained=True):
        super(CorrosionDetector, self).__init__()
        
        # Load ResNet18
        self.backbone = models.resnet18(weights='DEFAULT' if pretrained else None)
        
        # Replace final layer for multi-class classification
        num_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(num_features, num_classes),
        )
    
    def forward(self, x):
        return self.backbone(x)


# ============ TRAINING FUNCTIONS ============

def train_epoch(model, train_loader, criterion, optimizer, device):
    """Train for one epoch"""
    model.train()
    total_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(train_loader, desc="Training")
    for images, labels in pbar:
        images = images.to(device)
        labels = labels.to(device)
        
        # Forward pass
        outputs = model(images)
        loss = criterion(outputs, labels)
        
        # Backward pass
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        # Statistics
        total_loss += loss.item()
        _, predicted = torch.max(outputs.data, 1)
        total += labels.size(0)
        correct += (predicted == labels).sum().item()
        
        pbar.set_postfix({'loss': f'{loss.item():.4f}'})
    
    avg_loss = total_loss / len(train_loader)
    accuracy = correct / total
    return avg_loss, accuracy


def validate_epoch(model, val_loader, criterion, device):
    """Validate for one epoch"""
    model.eval()
    total_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(device)
            labels = labels.to(device)
            
            outputs = model(images)
            loss = criterion(outputs, labels)
            
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += labels.size(0)
            correct += (predicted == labels).sum().item()
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    avg_loss = total_loss / len(val_loader)
    accuracy = correct / total
    return avg_loss, accuracy, all_preds, all_labels


def train_corrosion_detector():
    """Main training function for corrosion detection"""
    
    print("="*60)
    print("Training Corrosion Detector")
    print("="*60)
    
    # Create model
    model = CorrosionDetector(num_classes=NUM_CLASSES, pretrained=True)
    model = model.to(DEVICE)
    
    print(f"\nModel: ResNet18 (Multi-Class Classifier)")
    print(f"Device: {DEVICE}")
    print(f"Classes: {NUM_CLASSES} - Corrosion Levels {CLASSES}")
    print(f"Training epochs: {NUM_EPOCHS}")
    print(f"Learning rate: {LEARNING_RATE}")
    
    # Check dataset
    cv_path = DATASET_ROOT / CV_SPLIT
    train_path = cv_path / "train"
    valid_path = cv_path / "val"
    test_path = DATASET_ROOT / "test"
    
    if not train_path.exists():
        print(f"❌ Dataset not found at {train_path}")
        return None
    
    print(f"\nUsing cross-validation split: {CV_SPLIT}")
    print(f"Dataset structure:")
    print(f"  Train: {train_path}")
    print(f"  Valid: {valid_path}")
    print(f"  Test:  {test_path}")
    
    # Load datasets
    print("\nLoading datasets...")
    
    try:
        train_dataset = datasets.ImageFolder(str(train_path), transform=train_transform)
        print(f"  ✓ Train set: {len(train_dataset)} images")
        
        if valid_path.exists():
            valid_dataset = datasets.ImageFolder(str(valid_path), transform=val_transform)
            print(f"  ✓ Valid set: {len(valid_dataset)} images")
        else:
            print(f"  ⚠ Valid set not found")
            valid_dataset = None
        
        if test_path.exists():
            test_dataset = datasets.ImageFolder(str(test_path), transform=val_transform)
            print(f"  ✓ Test set:  {len(test_dataset)} images")
        else:
            print(f"  ⚠ Test set not found")
            test_dataset = None
    
    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        return None
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True, num_workers=0)
    valid_loader = DataLoader(valid_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0) if valid_dataset else None
    test_loader = DataLoader(test_dataset, batch_size=BATCH_SIZE, shuffle=False, num_workers=0) if test_dataset else None
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    scheduler = optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.1)
    
    # Training loop
    print("\n" + "="*60)
    print("TRAINING")
    print("="*60)
    
    best_accuracy = 0.0
    train_losses = []
    train_accs = []
    val_losses = []
    val_accs = []
    
    for epoch in range(NUM_EPOCHS):
        print(f"\nEpoch {epoch+1}/{NUM_EPOCHS}")
        
        # Train
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, DEVICE)
        train_losses.append(train_loss)
        train_accs.append(train_acc)
        print(f"  Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f}")
        
        # Validate
        if valid_loader:
            val_loss, val_acc, _, _ = validate_epoch(model, valid_loader, criterion, DEVICE)
            val_losses.append(val_loss)
            val_accs.append(val_acc)
            print(f"  Valid Loss: {val_loss:.4f} | Valid Acc: {val_acc:.4f}")
            
            if val_acc > best_accuracy:
                best_accuracy = val_acc
                print(f"  ✓ Best accuracy: {best_accuracy:.4f}")
                torch.save(model.state_dict(), MODEL_OUTPUT_PATH)
        else:
            torch.save(model.state_dict(), MODEL_OUTPUT_PATH)
        
        scheduler.step()
    
    # Test evaluation
    if test_loader:
        print("\n" + "="*60)
        print("TEST EVALUATION")
        print("="*60)
        
        model.eval()
        test_preds = []
        test_labels = []
        
        with torch.no_grad():
            for images, labels in test_loader:
                images = images.to(DEVICE)
                outputs = model(images)
                _, predicted = torch.max(outputs.data, 1)
                test_preds.extend(predicted.cpu().numpy())
                test_labels.extend(labels.cpu().numpy())
        
        test_acc = accuracy_score(test_labels, test_preds)
        print(f"\nTest Accuracy: {test_acc:.4f}")
        
        print("\nClassification Report:")
        print(classification_report(test_labels, test_preds, target_names=CLASSES))
        
        print("\nConfusion Matrix:")
        cm = confusion_matrix(test_labels, test_preds)
        print(cm)

        # Generate visualizations
        print("\nGenerating visualizations...")
        plot_confusion_matrix(test_labels, test_preds, CLASSES, RESULTS_DIR / "corrosion_detector_confusion_matrix.png", title="Corrosion Detector — Confusion Matrix")
        plot_training_curves(train_losses, val_losses, train_accs, val_accs, RESULTS_DIR / "corrosion_detector_training_curves.png")
        plot_per_class_pr(test_labels, test_preds, CLASSES, RESULTS_DIR / "corrosion_detector_per_class_pr.png", title="Corrosion Detector — Per-Class Precision & Recall")

        # ROC-AUC
        model.eval()
        all_scores = []
        with torch.no_grad():
            for images, _ in test_loader:
                images = images.to(DEVICE)
                outputs = model(images)
                all_scores.extend(torch.softmax(outputs, dim=1).cpu().numpy())
        plot_roc_auc(test_labels, np.array(all_scores), CLASSES, RESULTS_DIR / "corrosion_detector_roc_auc.png", title="Corrosion Detector — ROC Curve")
        print(f"✓ Visualizations saved to {RESULTS_DIR}")
    
    # Save metadata
    print("\n" + "="*60)
    print("SAVING MODEL")
    print("="*60)
    
    metadata = {
        "model_type": "ResNet18 (Multi-Class Classifier)",
        "task": "Corrosion Level Detection",
        "num_classes": NUM_CLASSES,
        "classes": CLASSES,
        "corrosion_levels": {
            "5": "Low corrosion",
            "6": "Moderate corrosion",
            "7": "Significant corrosion",
            "8": "High corrosion",
            "9": "Severe corrosion"
        },
        "image_size": IMG_SIZE,
        "training_epochs": NUM_EPOCHS,
        "learning_rate": LEARNING_RATE,
        "best_accuracy": float(best_accuracy),
        "test_accuracy": float(test_acc) if test_loader else None,
        "classification_report": classification_report(test_labels, test_preds, target_names=CLASSES, output_dict=True) if test_loader else None,
        "confusion_matrix": confusion_matrix(test_labels, test_preds).tolist() if test_loader else None,
        "device": str(DEVICE),
        "dataset": {
            "train": len(train_dataset) if train_dataset else 0,
            "valid": len(valid_dataset) if valid_dataset else 0,
            "test": len(test_dataset) if test_dataset else 0
        }
    }
    
    metadata_path = RESULTS_DIR / "corrosion_detector_results.json"
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"\n✓ Model saved to {MODEL_OUTPUT_PATH}")
    print(f"✓ Metadata saved to {metadata_path}")
    
    return model


if __name__ == "__main__":
    model = train_corrosion_detector()
    
    print("\n" + "="*60)
    print("✅ Corrosion detector training complete!")
    print("="*60)
    print(f"\nUsage:")
    print(f"  from predict_unified import predict_corrosion")
    print(f"  result = predict_corrosion('path/to/image.jpg')")
    print(f"  # Returns: corrosion level 5-9")
