from __future__ import annotations

import argparse
from pathlib import Path
import time

import torch
from torch import nn
from torch.optim import AdamW
from torch.optim.lr_scheduler import ReduceLROnPlateau
from torch.utils.data import DataLoader
from torchvision import datasets, models, transforms

BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DATA_ROOT = BASE_DIR.parent.parent / 'devOps_Dataset' / 'project_data'
DEFAULT_OUTPUT_DIR = BASE_DIR / 'models'


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Train MobileNetV3 binary image classifier')
    parser.add_argument('--data-root', type=Path, default=DEFAULT_DATA_ROOT, help='Path to dataset root containing train/valid/test folders')
    parser.add_argument('--output-dir', type=Path, default=DEFAULT_OUTPUT_DIR, help='Directory to save trained model artifacts')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size')
    parser.add_argument('--epochs', type=int, default=25, help='Number of training epochs')
    parser.add_argument('--learning-rate', type=float, default=1e-4, help='Learning rate')
    parser.add_argument('--patience', type=int, default=5, help='Early stopping patience')
    parser.add_argument('--num-workers', type=int, default=0, help='DataLoader worker count')
    return parser.parse_args()


def build_transforms() -> tuple[transforms.Compose, transforms.Compose]:
    train_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(12),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    eval_transform = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
    ])
    return train_transform, eval_transform


def build_model(device: torch.device) -> torch.nn.Module:
    weights = models.MobileNet_V3_Small_Weights.DEFAULT
    model = models.mobilenet_v3_small(weights=weights)
    in_features = model.classifier[-1].in_features
    model.classifier[-1] = nn.Linear(in_features, 1)
    return model.to(device)


def evaluate(model: torch.nn.Module, loader: DataLoader, loss_fn: torch.nn.Module, device: torch.device) -> tuple[float, float]:
    model.eval()
    total_loss = 0.0
    total_correct = 0
    total_samples = 0
    with torch.inference_mode():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device).float().unsqueeze(1)
            logits = model(images)
            loss = loss_fn(logits, labels)
            total_loss += loss.item() * images.size(0)
            probabilities = torch.sigmoid(logits)
            predictions = (probabilities >= 0.5).float()
            total_correct += (predictions == labels).sum().item()
            total_samples += images.size(0)
    return total_loss / total_samples, total_correct / total_samples


def train(args: argparse.Namespace) -> None:
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    train_transform, eval_transform = build_transforms()

    args.data_root = args.data_root if args.data_root.is_absolute() else (BASE_DIR / args.data_root).resolve()
    args.output_dir = args.output_dir if args.output_dir.is_absolute() else (BASE_DIR / args.output_dir).resolve()

    train_dir = args.data_root / 'train'
    valid_dir = args.data_root / 'valid'
    test_dir = args.data_root / 'test'

    if not train_dir.exists() or not valid_dir.exists():
        raise FileNotFoundError(f'Dataset folders not found under {args.data_root}')

    train_dataset = datasets.ImageFolder(train_dir, transform=train_transform)
    valid_dataset = datasets.ImageFolder(valid_dir, transform=eval_transform)
    test_dataset = datasets.ImageFolder(test_dir, transform=eval_transform) if test_dir.exists() else None

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True, num_workers=args.num_workers)
    valid_loader = DataLoader(valid_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers)
    test_loader = DataLoader(test_dataset, batch_size=args.batch_size, shuffle=False, num_workers=args.num_workers) if test_dataset else None

    model = build_model(device)
    loss_fn = nn.BCEWithLogitsLoss()
    optimizer = AdamW(model.parameters(), lr=args.learning_rate)
    scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=2)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    best_loss = float('inf')
    best_path = args.output_dir / 'mobilenetv3_small_binary.pth'
    early_stop_counter = 0

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss = 0.0
        start = time.time()

        for images, labels in train_loader:
            images = images.to(device)
            labels = labels.to(device).float().unsqueeze(1)
            optimizer.zero_grad()
            logits = model(images)
            loss = loss_fn(logits, labels)
            loss.backward()
            optimizer.step()
            epoch_loss += loss.item() * images.size(0)

        epoch_loss /= len(train_loader.dataset)
        valid_loss, valid_acc = evaluate(model, valid_loader, loss_fn, device)
        scheduler.step(valid_loss)

        print(f'Epoch {epoch}/{args.epochs} | train_loss={epoch_loss:.4f} | valid_loss={valid_loss:.4f} | valid_acc={valid_acc:.4f} | time={time.time() - start:.1f}s')

        if valid_loss < best_loss:
            best_loss = valid_loss
            early_stop_counter = 0
            torch.save(model.state_dict(), best_path)
            print(f'  Saved best model to {best_path}')
        else:
            early_stop_counter += 1
            print(f'  No improvement for {early_stop_counter}/{args.patience} epochs')
            if early_stop_counter >= args.patience:
                print('Early stopping triggered')
                break

    if best_path.exists():
        model.load_state_dict(torch.load(best_path, map_location=device))

    if test_loader is not None and best_path.exists():
        test_loss, test_acc = evaluate(model, test_loader, loss_fn, device)
        print(f'Test loss: {test_loss:.4f} | Test accuracy: {test_acc:.4f}')

    try:
        onnx_path = args.output_dir / 'mobilenetv3_small_binary.onnx'
        dummy_input = torch.randn(1, 3, 128, 128, device=device)
        model.eval()
        torch.onnx.export(model, dummy_input, onnx_path, input_names=['input'], output_names=['output'], opset_version=17)
        print(f'Exported ONNX model to {onnx_path}')
    except Exception as e:
        print(f'Warning: ONNX export failed: {e}. Proceeding without ONNX export.')


if __name__ == '__main__':
    train(parse_args())
