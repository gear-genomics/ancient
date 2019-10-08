from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPool2D, Flatten, Dense, LeakyReLU, BatchNormalization, DepthwiseConv2D, MaxPooling2D, Dropout
from math import sqrt
import tensorflow as tf
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import argparse
import sys
import collections
from PIL import Image
from sklearn.metrics import confusion_matrix

# TF version
print(tf.__version__)
tf.keras.backend.clear_session()

# Parse command line
parser = argparse.ArgumentParser(description='Deep learning')
parser.add_argument('-i', '--images', metavar='image.tsv.gz', required=True, dest='images', help='images tsv file (required)')
parser.add_argument('-m', '--meta', metavar='meta.info', required=True, dest='meta', help='sample inforamtion (required)')
args = parser.parse_args()
    
# Parameters
epochs = 300

# Load the images and meta information
df = pd.read_csv(args.images, compression="gzip", sep="\t", header=None)
meta = pd.read_csv(args.meta, sep="\t", header=None)
meta.columns = ['sample', 'population', 'type', 'sex', 'study']
meta = meta[["sample", "population","study"]]
#colname = df.columns[-1]   # image name is last column
colname = df.columns[0]  # image name is first column
df = df.merge(meta, left_on=colname, right_on='sample')
df['population'] = df['population'].astype('category')
classes = len(df['population'].unique())
class_names = df['population'].cat.categories

# Split into training (1kgp) and testing (PCAWG)
testing = df[df['study'] == "PCAWG"]
df = df[df['study'] == "1kgp"]
print(collections.Counter(df['population']), ' training population distribution')
print(collections.Counter(testing['population']), ' testing population distribution')

# Split into outcome and predictors
outcome = df[["sample", "population"]]
df = df.drop(columns=[colname, "sample", "population", "study"])
print(min(list(df.min())), ' minimum pixel value')
print(max(list(df.max())), ' maximum pixel value')
outcomeTest = testing[["sample", "population"]]
testing = testing.drop(columns=[colname, "sample", "population", "study"])

# Set image dimensions
imgrows = int(sqrt(df.shape[1]))
imgcols = int(sqrt(df.shape[1]))
X_train = np.array(df).reshape(df.shape[0], imgrows, imgcols, 1)
X_test = np.array(testing).reshape(testing.shape[0], imgrows, imgcols, 1)

# outcome, y_train
y_train = np.array(outcome['population'].cat.codes, dtype=np.uint8)
y_test = np.array(outcomeTest['population'].cat.codes, dtype=np.uint8)
print(X_train.shape, ' train images shape')
print(len(y_train), ' train labels')
print(X_test.shape, ' test images shape')
print(len(y_test), ' test labels')

# Print a test image
image = Image.fromarray(np.squeeze(X_train[0,:,:,:]) * 255)
image = image.convert(mode='L')
image.save(str(outcome['sample'].iloc[0]) + '.png')
image = Image.fromarray(np.squeeze(X_test[0,:,:,:]) * 255)
image = image.convert(mode='L')
image.save(str(outcomeTest['sample'].iloc[0]) + '.png')

# Reshape and normalize images
X_train = X_train.astype('float32')
X_test = X_test.astype('float32')
ish = (imgrows, imgcols, 1)
print(ish, "image shape")

# Model
model = Sequential([
    Conv2D(filters=32, kernel_size=3, strides=3, padding='same', input_shape=ish),
    MaxPool2D(pool_size=3, padding='same'),
    Dropout(0.1),
    Conv2D(filters=64, kernel_size=3, strides=1, padding='same', activation='relu'),
    MaxPool2D(pool_size=3, padding='same'),
    Dropout(0.1),
    Conv2D(filters=128, kernel_size=3, strides=1, padding='same', activation='relu'),
    MaxPool2D(pool_size=3, padding='same'),
    Dropout(0.1),
    Flatten(),
    Dense(256, activation='relu'),
    Dropout(0.3),
    Dense(classes, activation='softmax')
    ])

# Compile
#model.compile(optimizer=tf.keras.optimizers.Adam(lr=0.0001), loss = 'sparse_categorical_crossentropy', metrics=['accuracy'])
model.compile(optimizer='adam', loss = 'sparse_categorical_crossentropy', metrics=['accuracy'])
print(model.summary())
tf.keras.utils.plot_model(model, to_file="model.png", show_shapes=True)

# Run
history = model.fit(X_train, y_train, epochs=epochs, batch_size=128, shuffle=True, validation_data=(X_test, y_test), verbose=1)
score = model.evaluate(X_test, y_test, verbose=0)
print(score)

# Save model
model.save('ancestry.h5')

# Evaluate
plt.clf()
pd.DataFrame(history.history).plot(figsize=(8,5))
plt.grid(True)
plt.gca().set_ylim(0,1)
plt.savefig("acc_loss.png")

# Predict
pred = model.predict(X_test)
predcat = np.asarray([np.argmax(x) for x in pred])
test_labels = np.asarray([class_names[x] for x in outcomeTest['population'].cat.codes])
pred_labels = np.asarray([class_names[x] for x in predcat])
cm = confusion_matrix(test_labels, pred_labels)
plt.clf()
plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
plt.title('Confusion Matrix')
plt.xticks(np.arange(len(class_names)), class_names, rotation=90)
plt.yticks(np.arange(len(class_names)), class_names)
plt.tight_layout()
plt.ylabel('True label')
plt.xlabel('Predicted label')
plt.savefig("confusion_matrix.png")

outcomeTest['prediction'] = pred_labels
outcomeTest['probability'] = [np.max(x) for x in pred]
outcomeTest.to_csv('outcome.tsv', sep='\t', encoding='utf-8', index=False)

